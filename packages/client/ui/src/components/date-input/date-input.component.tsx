import { useMemo, useRef } from 'react';
import { Input } from '../input/input.component.js';
import { useFormatter } from '../../formatting/use-formatter.js';
import { useMessages } from '../../i18n/provider.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { setNativeValue } from '../../primitives/set-native-value.js';
import { formatIsoDate, parseIsoDate } from '../../date/civil-date.js';
import { dateInputMessages } from './date-input.messages.js';
import type { DatePart, DateInputProps } from './date-input.types.js';

const PARTS: DatePart[] = ['day', 'month', 'year'];

function isPart(type: string): type is DatePart {
  return (PARTS as string[]).includes(type);
}

/**
 * How this locale writes a date: which parts, in which order, with which
 * separators between them.
 *
 * The separator is READ rather than chosen. `it` and `en` write `/`, `de`
 * writes `.`, `ja` writes `/` around parts it also suffixes — picking one
 * ourselves would be a fourth locale decision made in the wrong place, when
 * `formatToParts` already returns the literals in position.
 */
function usePattern(locale: string | undefined) {
  return useMemo(() => {
    // A fixed instant, not `now`: the pattern belongs to the locale and must not
    // depend on the day the component happens to render.
    const sample = new Date(Date.UTC(2026, 7, 12));
    const parts = new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'UTC',
    }).formatToParts(sample);
    const order = parts.map((part) => part.type).filter(isPart);
    // A pattern missing one of the three is not one we can lay out — fall back
    // rather than render a field that can never hold a whole date.
    return order.length === 3
      ? { parts, order }
      : {
          parts: [
            { type: 'day', value: '12' },
            { type: 'literal', value: '/' },
            { type: 'month', value: '08' },
            { type: 'literal', value: '/' },
            { type: 'year', value: '2026' },
          ] as Intl.DateTimeFormatPart[],
          order: PARTS,
        };
  }, [locale]);
}

/**
 * A date, typed in the order the design system's locale writes it.
 *
 * It exists because the platform's own `input[type=date]` cannot be told which
 * locale to lay its segments out in (ADR-0027): that order is the browser's, so
 * on a page whose language the app declares it disagrees with the `Time`, the
 * `Numeric` and the formatted `Table` cell beside it. This one follows
 * `useFormatter()`, which is the locale all of those read.
 *
 * WHAT IT STORES is an ISO `YYYY-MM-DD` string, on a carrier hidden beside the
 * field, under the field's `name`. What the user SEES is that date written the
 * way their locale writes it. A server never receives `12/08/2026` and has to
 * guess which number is the month.
 *
 * It is one text field, so it composes like `Input`: name it with a `Field`, or
 * reach for `FormDateInput`, which does that for you.
 */
function DateInput(props: DateInputProps) {
  const {
    name,
    defaultValue,
    defaultDate,
    onDateChange,
    onChange,
    placeholder,
    ...rest
  } = props;

  const formatter = useFormatter();
  const t = useMessages(dateInputMessages);
  const { parts, order } = usePattern(formatter.locale);

  // Read only from the change handler, never during render.
  const carrier = useRef<HTMLInputElement>(null);

  /** `12/08/2026` for `it`, `08/12/2026` for `en-US` — the ISO date, localised. */
  const display = (iso: string): string => {
    const date = parseIsoDate(iso);
    if (date === null) return '';
    const pad = (n: number, width: number) => String(n).padStart(width, '0');
    return parts
      .map((part) =>
        part.type === 'day'
          ? pad(date.day, 2)
          : part.type === 'month'
            ? pad(date.month, 2)
            : part.type === 'year'
              ? pad(date.year, 4)
              : part.value,
      )
      .join('');
  };

  // `defaultDate` is sugar over `defaultValue`, so an explicit `defaultValue`
  // still wins — the precedence every component here gives the call site.
  const seeded = defaultDate === undefined ? null : formatIsoDate(defaultDate);
  const seed = defaultValue ?? seeded ?? '';

  // SAY SO rather than start empty and leave it to be debugged twice.
  useDevWarning(
    defaultDate !== undefined && seeded === null,
    `DateInput: \`defaultDate\` ${JSON.stringify(defaultDate)} does not name a day that exists, so the field starts empty. Months are 1-12 and the year is four digits.`,
  );

  /** `gg/mm/aaaa`, `mm/dd/yyyy` — the hint letters in the locale's own frame. */
  const hint = parts
    .map((part) => (isPart(part.type) ? t(part.type) : part.value))
    .join('');

  /**
   * Read what was typed as a date, or as nothing.
   *
   * Split on any run of NON-DIGITS rather than on the locale's separator: a
   * person typing a date uses whatever their keyboard puts under their thumb —
   * `12/08/2026`, `12-08-2026`, `12.08.2026`, `12 08 2026` — and refusing three
   * of those to honour a separator we only ever meant as a hint would be
   * pedantry that reads as a bug. The ORDER is the locale's and is not
   * negotiable, because `03/04` has no meaning without it.
   */
  const read = (typed: string): string => {
    const groups = typed.split(/\D+/).filter((group) => group !== '');
    if (groups.length !== 3) return '';
    const values = new Map<DatePart, string>(
      order.map((part, index) => [part, groups[index] ?? '']),
    );
    const year = values.get('year') ?? '';
    // A two-digit year is a guess about a century, and a wrong guess is silent:
    // `26` is the year 26 or it is nothing (ADR-0027).
    if (year.length !== 4) return '';
    return (
      formatIsoDate({
        year: Number(year),
        month: Number(values.get('month')),
        day: Number(values.get('day')),
      }) ?? ''
    );
  };

  return (
    <>
      <Input
        {...rest}
        inputMode="numeric"
        autoComplete="bday"
        placeholder={placeholder ?? hint}
        defaultValue={display(seed)}
        onChange={(event) => {
          const iso = read(event.currentTarget.value);
          const element = carrier.current;
          if (element !== null && element.value !== iso) {
            setNativeValue(element, iso);
          }
          onDateChange?.(parseIsoDate(iso));
        }}
      />
      {/*
        The carrier. A text input hidden with the `hidden` ATTRIBUTE, never
        `type="hidden"`, and the difference is the whole design: measured,
        `form.reset()` restores a text input and does NOT restore a
        `type="hidden"` one, so a hidden-typed carrier would come back from a
        reset holding a stale value while the field beside it went back. React
        also declines to wire `onChange` on `type="hidden"`, so a `register()`
        binding would hear nothing from it.

        `tabIndex` and `aria-hidden` say what `hidden` already says. They are
        here because `hidden` is one consumer stylesheet away from being
        overridden, and a carrier that becomes visible must still not be
        reachable or announced.
      */}
      <input
        ref={carrier}
        data-carrier=""
        type="text"
        hidden
        name={name}
        defaultValue={seed}
        onChange={onChange}
        // Disabled together, because a disabled control is not submitted: left
        // enabled, the carrier would keep posting a value for a field the user
        // was told they cannot touch. `required` is the opposite and stays on
        // the VISIBLE field only — a required carrier is an invalid control the
        // browser cannot focus, so it refuses the submit showing nothing.
        disabled={rest.disabled}
        tabIndex={-1}
        aria-hidden="true"
      />
    </>
  );
}

export { DateInput };

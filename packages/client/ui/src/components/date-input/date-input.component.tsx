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

/** How many digits each part holds, and the largest it may ever say. */
const WIDTH: Record<DatePart, number> = { day: 2, month: 2, year: 4 };
const CEILING: Record<DatePart, number> = { day: 31, month: 12, year: 9999 };

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
   * The mask: what was typed, reduced to what a date can contain.
   *
   * ONLY DIGITS SURVIVE, and the separators are put back from the locale's own
   * pattern — so a letter cannot be typed at all, a second separator cannot be
   * typed, and `12082026` becomes `12/08/2026` on its own. Typing whatever the
   * keyboard puts under the thumb still works, because `-`, `.` and a space are
   * dropped along with everything else that is not a digit rather than being
   * accepted as alternatives.
   *
   * A DIGIT THAT MAKES A PART IMPOSSIBLE IS REFUSED, not corrected: a month
   * cannot reach 45, a day cannot reach 32. It is refused per digit, on the
   * number the part would then say — so `4` is still a fine start for a month
   * (April) and only the `5` after it is dropped. Correcting instead of
   * refusing would move a digit the user is still typing, which reads as the
   * field fighting back.
   *
   * What it does NOT do is decide whether the whole date exists: 30 February
   * can be typed, and is then simply not stored. Blocking it mid-edit would
   * mean refusing the `3` of a `30` that was on its way to March.
   */
  const mask = (typed: string): { text: string; iso: string } => {
    const digits = [...typed].filter((char) => char >= '0' && char <= '9');
    const held = new Map<DatePart, string>();
    let index = 0;
    for (const part of order) {
      let value = '';
      while (index < digits.length && value.length < WIDTH[part]) {
        const candidate = value + digits[index];
        // A digit that does not fit is NOT CONSUMED. Eating it was the first
        // version and it was catastrophic rather than merely wrong: on
        // `12/08/2026`, one Backspace over the day left `1/08/2026`, whose
        // digits then re-flowed into a month of `8` that swallowed `2`, `0`,
        // `2` and `6` one after another because each made it impossible. Seven
        // of eight digits gone, on the most ordinary correction there is.
        if (Number(candidate) > CEILING[part]) break;
        value = candidate;
        index += 1;
      }
      // A part closed early by a digit that did not fit is PADDED, so that digit
      // starts the next part instead of being lost: `5` then `9` is the 5th,
      // then September — which is what the person typing meant, and what every
      // date mask does. Padding only when digits remain keeps it from firing
      // while a part is still being typed: `12` `4` stays `12/4`, waiting.
      if (value !== '' && value.length < WIDTH[part] && index < digits.length) {
        value = value.padStart(WIDTH[part], '0');
      }
      held.set(part, value);
    }

    let text = '';
    for (const piece of parts) {
      if (!isPart(piece.type)) {
        text += piece.value;
        continue;
      }
      const value = held.get(piece.type) ?? '';
      text += value;
      // An incomplete part ends the string: everything after it would be a
      // separator or a field with nothing in front of it.
      if (value.length < WIDTH[piece.type]) return { text, iso: '' };
    }

    const year = held.get('year') ?? '';
    // A two-digit year is a guess about a century, and a wrong guess is silent:
    // `26` is the year 26 or it is nothing (ADR-0027). Unreachable while the
    // loop above stops on a short part, and kept because that is a property of
    // this function rather than of its caller.
    if (year.length !== 4) return { text, iso: '' };

    return {
      text,
      iso:
        formatIsoDate({
          year: Number(year),
          month: Number(held.get('month')),
          day: Number(held.get('day')),
        }) ?? '',
    };
  };

  /**
   * Where the caret goes once the text has been rewritten under it.
   *
   * Counted in DIGITS, not in characters: the mask inserts and removes
   * separators, so a character index taken before it means nothing after. Put
   * the caret after the same digit the user was behind, and typing in the
   * middle of a date stays possible — which is the whole reason not to just
   * send it to the end.
   */
  const caretFor = (masked: string, typed: string, caret: number): number => {
    const isDigit = (char: string) => char >= '0' && char <= '9';
    const before = [...typed.slice(0, caret)].filter(isDigit).length;
    if (before === 0) return 0;
    let seen = 0;
    for (let position = 0; position < masked.length; position += 1) {
      if (!isDigit(masked[position] ?? '')) continue;
      seen += 1;
      if (seen !== before) continue;
      // PAST THE SEPARATOR, not in front of it. Landing between the last digit
      // of a finished part and the `/` that follows means the next keystroke is
      // inserted before it — the mask repairs that every time, but the caret
      // then jumps backwards under the user's hand on every third character.
      let after = position + 1;
      while (after < masked.length && !isDigit(masked[after] ?? '')) after += 1;
      return after;
    }
    return masked.length;
  };

  return (
    <>
      <Input
        // BEFORE the spread, so a consumer can still say otherwise. After it,
        // every one of these would be silently discarded while the type kept
        // accepting them — a prop that compiles and does nothing.
        inputMode="numeric"
        {...rest}
        // NO `autoComplete` of our own. `bday` was hardcoded here for one
        // afternoon, and a token is a CLAIM about what the field holds: most
        // dates are not birthdays — a booking, an expiry, a start date — so on
        // every one of those it tells the browser something false, and browsers
        // act on it by offering to fill a saved date of birth. The consumer
        // knows what their date is for; `autoComplete` passes straight through
        // like every other native attribute.
        placeholder={placeholder ?? hint}
        // NO `maxLength`, deliberately. It looks like it says what the mask
        // says and does not: it counts CHARACTERS where the mask counts DIGITS,
        // so the browser truncates before the mask ever runs. Measured — with
        // `maxLength={10}`, pasting `1a2b0c8d2026` arrived as `1a2b0c8d20` and
        // produced `12/08/20`, losing the year. Anything longer than a bare
        // date — `2026-08-12T00:00:00Z` out of an API — would lose digits the
        // same way. The mask is the constraint, and one constraint is enough.
        defaultValue={display(seed)}
        onChange={(event) => {
          const field = event.currentTarget;
          const typed = field.value;
          const caret = field.selectionStart ?? typed.length;
          const { text, iso } = mask(typed);

          // Write the masked text straight onto the node. It is an uncontrolled
          // input, so React is not going to re-render it back — and a plain
          // assignment is right HERE, unlike on the carrier: this value came
          // from a real keystroke, so React has already heard it and the
          // `input` event `setNativeValue` dispatches would only arrive a
          // second time.
          if (text !== typed) {
            field.value = text;
            const position = caretFor(text, typed, caret);
            field.setSelectionRange(position, position);
          }

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

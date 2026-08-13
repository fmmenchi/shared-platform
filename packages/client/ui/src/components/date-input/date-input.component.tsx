import { useEffect, useMemo, useRef } from 'react';
import { Input } from '../input/input.component.js';
import { useFormatter } from '../../formatting/use-formatter.js';
import { useMessages } from '../../i18n/provider.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { setNativeValue } from '../../primitives/set-native-value.js';
import { formatIsoDate, parseIsoDate } from '../../date/civil-date.js';
import { dateInputMessages } from './date-input.messages.js';
import type { DatePart, DateInputProps } from './date-input.types.js';
import styles from './date-input.module.css';

const PARTS: DatePart[] = ['day', 'month', 'year'];

/** How many digits each part holds, and the range it may ever say. */
const WIDTH: Record<DatePart, number> = { day: 2, month: 2, year: 4 };
const CEILING: Record<DatePart, number> = { day: 31, month: 12, year: 9999 };
const FLOOR: Record<DatePart, number> = { day: 1, month: 1, year: 1 };

function isPart(type: string): type is DatePart {
  return (PARTS as string[]).includes(type);
}

/**
 * How this locale writes a date: which parts, in which order, with which
 * separators — and in which digits.
 *
 * THE CALENDAR IS PINNED TO GREGORIAN, and that is a correctness fix rather
 * than a simplification. `th-TH` is Buddhist by default and `fa-IR` Persian, so
 * an unpinned pattern put OUR Gregorian numbers into THEIR frame: a Thai user
 * read `2569` off the `Time` beside the field, typed `2569`, and the carrier
 * stored `2569-08-12` — 543 years wrong, accepted in silence. ADR-0027 puts
 * non-Gregorian calendars out of scope; this is what putting them out of scope
 * has to look like in code. The era literal went with it, which is why nobody
 * gets `AP 2026-08-12` any more either.
 *
 * THE DIGITS ARE NOT PINNED, deliberately. An `ar-EG` page renders `١٢` in
 * every `Time` and `Table` cell, so a field beside them showing `12` would be
 * the very mismatch this component exists to remove — one layer down.
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
      calendar: 'gregory',
    })
      .formatToParts(sample)
      // BIDI CONTROLS OUT OF THE LITERALS. Every `ar-*` pattern separates its
      // parts with U+200F RIGHT-TO-LEFT MARK followed by `/`, so a date read
      // back out of the field carried two invisible characters that travelled
      // with any copy-paste and made the string unequal to the same date typed
      // by hand. They also cost a Backspace at a separator its effect, since
      // one press deletes the `/` and leaves the mark. A field inside a `dir`
      // subtree — which the provider gives it — needs none of them.
      .map((part) =>
        part.type === 'literal'
          ? { ...part, value: part.value.replace(/[‎‏؜]/g, '') }
          : part,
      );
    const order = parts.map((part) => part.type).filter(isPart);

    // The locale's own numerals, 0-9 in order, so `١٢` can be read and written
    // as readily as `12`.
    const format = new Intl.NumberFormat(locale, { useGrouping: false });
    const numerals = Array.from({ length: 10 }, (_, digit) =>
      format.format(digit),
    );

    return order.length === 3
      ? { parts, order, numerals }
      : {
          // Unreachable for every locale that resolves to Gregorian, and kept
          // for the one that does not: ISO order, for the same reason
          // `toMachineDate` hard-codes `en-CA` rather than asking the reader.
          parts: [
            { type: 'year', value: '2026' },
            { type: 'literal', value: '-' },
            { type: 'month', value: '08' },
            { type: 'literal', value: '-' },
            { type: 'day', value: '12' },
          ] as Intl.DateTimeFormatPart[],
          order: ['year', 'month', 'day'] as DatePart[],
          numerals,
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
 * WHAT IT STORES is an ISO `YYYY-MM-DD` string, on a carrier beside the field,
 * under the field's `name`. What the user SEES is that date written the way
 * their locale writes it, in their locale's digits. A server never receives
 * `12/08/2026` and has to guess which number is the month.
 *
 * It is one text field, so it composes like `Input`: name it with a `Field`, or
 * reach for `FormDateInput`, which does that for you.
 */
function DateInput(props: DateInputProps) {
  const {
    className,
    name,
    defaultValue,
    defaultDate,
    onDateChange,
    onChange,
    placeholder,
    carrierRef,
    ref,
    ...rest
  } = props;

  const formatter = useFormatter();
  const t = useMessages(dateInputMessages);
  const { parts, order, numerals } = usePattern(formatter.locale);

  const carrier = useRef<HTMLInputElement>(null);
  const field = useRef<HTMLInputElement>(null);

  /** This locale's numeral for an ASCII digit, and back again. */
  const toLocal = (ascii: string) =>
    [...ascii].map((char) => numerals[Number(char)] ?? char).join('');
  const toAscii = (char: string) => {
    const index = numerals.indexOf(char);
    if (index !== -1) return String(index);
    return char >= '0' && char <= '9' ? char : '';
  };

  /**
   * `12/08/2026` for `it`, `١٢/٠٨/٢٠٢٦` for `ar-EG` — the ISO date, localised.
   *
   * Memoised on the pattern so the re-display effect below can depend on it
   * honestly, rather than on a suppression comment. The React Compiler refuses
   * to optimise a file that carries one, which is the right trade: a stale
   * closure here would redraw a date in the wrong order.
   */
  const display = useMemo(() => {
    const local = (ascii: string) =>
      [...ascii].map((char) => numerals[Number(char)] ?? char).join('');
    return (iso: string): string => {
      const date = parseIsoDate(iso);
      if (date === null) return '';
      const pad = (value: number, width: number) =>
        local(String(value).padStart(width, '0'));
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
  }, [parts, numerals]);

  // `defaultDate` is sugar over `defaultValue`, so an explicit `defaultValue`
  // still wins — the precedence every component here gives the call site.
  const seeded = defaultDate === undefined ? null : formatIsoDate(defaultDate);
  const asked = defaultValue ?? seeded ?? '';
  // THE CARRIER IS SEEDED FROM THE VALIDATED PARSE, not from what was handed in.
  // Seeded raw, `defaultValue="tomorrow"` left the field empty and posted
  // `tomorrow` — from the component whose first promise is that a server never
  // has to guess what it is holding.
  const seed = asked !== '' && parseIsoDate(asked) !== null ? asked : '';

  // SAY SO rather than start empty and leave it to be debugged twice.
  useDevWarning(
    defaultDate !== undefined && seeded === null,
    `DateInput: \`defaultDate\` ${JSON.stringify(defaultDate)} does not name a day that exists, so the field starts empty. Months are 1-12 and the year is four digits.`,
  );
  useDevWarning(
    asked !== '' && seed === '',
    `DateInput: \`defaultValue\` ${JSON.stringify(asked)} is not an ISO date, so the field starts empty. It takes \`YYYY-MM-DD\` — the shape it stores — not the shape it shows.`,
  );

  /** `gg/mm/aaaa`, `mm/dd/yyyy` — the hint letters in the locale's own frame. */
  const hint = parts
    .map((part) => (isPart(part.type) ? t(part.type) : part.value))
    .join('');

  /**
   * The mask: what was typed, reduced to what a date can contain.
   *
   * ONLY DIGITS SURVIVE — this locale's or ASCII, so an Arabic keyboard and a
   * numeric keypad both work — and the separators are put back from the
   * locale's own pattern. A letter cannot be typed, a second separator cannot
   * be typed, and `12082026` becomes `12/08/2026` on its own.
   *
   * A DIGIT THAT MAKES A PART IMPOSSIBLE IS REFUSED AND NOT CONSUMED. Consuming
   * it was the first version and it was catastrophic rather than merely wrong:
   * a part holding one digit that no second digit could complete then swallowed
   * every digit after it, so `8/12/2026` in `en-US` left `8` behind and no
   * further keystroke could ever land. Left in place, the digit starts the next
   * part instead — `5` then `9` is the 5th, then September.
   *
   * BOTH ENDS ARE ENFORCED. A ceiling alone let `00/00/2026` be typed in full:
   * complete-looking, and storing nothing, with nothing to tell the user why.
   *
   * What it does NOT decide is whether the whole date exists: 30 February can
   * be typed, and is then simply not stored. Blocking it mid-edit would mean
   * refusing the `3` of a `30` that was on its way to March.
   */
  const mask = (typed: string): { text: string; iso: string } => {
    const digits = [...typed].map(toAscii).filter((char) => char !== '');
    const held = new Map<DatePart, string>();
    let index = 0;

    const admits = (part: DatePart, candidate: string) => {
      const value = Number(candidate);
      if (value > CEILING[part]) return false;
      // A part is allowed to be `0` while it is still growing — `0` is on its
      // way to `05` — but never once it is as wide as it will get.
      return candidate.length < WIDTH[part] || value >= FLOOR[part];
    };

    for (const part of order) {
      let value = '';
      while (index < digits.length && value.length < WIDTH[part]) {
        const candidate = value + digits[index];
        if (!admits(part, candidate)) break;
        value = candidate;
        index += 1;
      }
      // A part closed early by a digit that did not fit is PADDED, so that digit
      // starts the next part rather than being lost. Only when digits remain, so
      // it does not fire while a part is still being typed: `12` `4` waits at
      // `12/4`. And never into a value the part may not hold, which is what
      // keeps a lone `0` from becoming `00`.
      const padded = value.padStart(WIDTH[part], '0');
      if (
        value !== '' &&
        value.length < WIDTH[part] &&
        index < digits.length &&
        Number(padded) >= FLOOR[part]
      ) {
        value = padded;
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
      text += toLocal(value);
      // An incomplete part ends the string: everything after it would be a
      // separator, or a field with nothing in front of it.
      if (value.length < WIDTH[piece.type]) return { text, iso: '' };
    }

    return {
      text,
      iso:
        formatIsoDate({
          year: Number(held.get('year')),
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
   * the caret after the same digit the user was behind — and past the separator
   * that follows it, or the next keystroke lands in front of the `/` and the
   * caret jumps backwards on every third character.
   */
  const caretFor = (masked: string, typed: string, caret: number): number => {
    const before = [...typed.slice(0, caret)].filter(
      (char) => toAscii(char) !== '',
    ).length;
    if (before === 0) return 0;
    let seen = 0;
    for (let position = 0; position < masked.length; position += 1) {
      if (toAscii(masked[position] ?? '') === '') continue;
      seen += 1;
      if (seen !== before) continue;
      let after = position + 1;
      while (after < masked.length && toAscii(masked[after] ?? '') === '') {
        after += 1;
      }
      return after;
    }
    return masked.length;
  };

  const write = (iso: string) => {
    const element = carrier.current;
    if (element === null || element.value === iso) return;
    const wrote = setNativeValue(element, iso);
    if (!wrote && process.env.NODE_ENV !== 'production') {
      console.warn(
        'DateInput: this environment has no `value` setter on HTMLInputElement.prototype, so the field cannot tell a form library what was typed.',
      );
    }
  };

  // RE-DISPLAY WHEN THE LOCALE MOVES. React does not re-apply `defaultValue` to
  // a field the user has touched, so a live language switch — which ADR-0027
  // makes the supported way to re-locale a subtree — left `01/02/2000` on
  // screen under a `mm/dd/yyyy` hint, meaning one day to the reader and another
  // to the carrier, until the next keystroke silently swapped them.
  useEffect(() => {
    const element = field.current;
    if (element === null) return;
    const iso = carrier.current?.value ?? '';
    if (iso === '') return;
    element.value = display(iso);
  }, [display]);

  return (
    <>
      <Input
        // BEFORE the spread, so a consumer can still say otherwise. After it,
        // this would compile, typecheck and do nothing.
        inputMode="numeric"
        // NO `autoComplete` of our own. A token is a CLAIM about what the field
        // holds, and most dates are not birthdays — a booking, an expiry, a
        // start date — so `bday` told the browser something false on every one
        // of them, and browsers act on it. It passes through like any other
        // native attribute; the consumer knows what their date is for.
        {...rest}
        className={className}
        placeholder={placeholder ?? hint}
        defaultValue={display(seed)}
        ref={mergeRefs(field, ref)}
        onChange={(event) => {
          const element = event.currentTarget;
          const typed = element.value;
          const caret = element.selectionStart ?? typed.length;
          const { text, iso } = mask(typed);

          // Written straight onto the node. It is uncontrolled, so React will
          // not re-render it back — and a plain assignment is right HERE,
          // unlike on the carrier: this value came from a real keystroke, so
          // React has already heard it.
          if (text !== typed) {
            element.value = text;
            const position = caretFor(text, typed, caret);
            element.setSelectionRange(position, position);
          }

          write(iso);
          onDateChange?.(parseIsoDate(iso));
        }}
      />
      {/*
        The carrier: the field's `name`, holding ISO.

        A text input, never `type="hidden"` — measured, `form.reset()` restores
        the first and not the second, so a hidden-typed carrier would come back
        from a reset holding a stale value while the field beside it went back.
        React also declines to wire `onChange` on `type="hidden"`.

        Hidden by CSS rather than the `hidden` ATTRIBUTE, and out of the tree by
        `aria-hidden`, because it must stay FOCUSABLE: react-hook-form's
        `register()` reads the value off the element its ref was given, and
        `FormErrorSummary` finds a field by `name` and calls `focus()` on it.
        Both land here, and `onFocus` hands focus on to the visible field, so it
        is never where the caret rests.
      */}
      <input
        ref={mergeRefs(carrier, carrierRef)}
        data-carrier=""
        className={styles.carrier}
        type="text"
        name={name}
        defaultValue={seed}
        onChange={onChange}
        onFocus={() => field.current?.focus()}
        readOnly
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

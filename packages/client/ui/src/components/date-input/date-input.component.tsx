import { useEffect, useId, useMemo, useRef } from 'react';
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
 * THE CALENDAR IS PINNED TO GREGORIAN, and the pin does LESS than it looks —
 * stated precisely because an earlier version of this comment claimed more.
 * Measured: for `th-TH` (Buddhist) and `fa-IR` (Persian) the pinned and unpinned
 * patterns have the same parts, the same order and the same literals, differing
 * only in the year VALUE, which this component discards — it fills the frame
 * from its own ISO parse. What the pin actually removes is the ERA:
 * `ja-JP-u-ca-japanese` yields an `era` part and `zh-TW-u-ca-roc` a `民國`, so
 * without it the field showed `R2026/08/12`, a Gregorian year stamped with an
 * era that contradicts it.
 *
 * What no pin can fix is the year itself: on a `th-TH` page a `Time` says 2569
 * and this field says 2026 for the same day. ADR-0027 puts non-Gregorian
 * calendars out of scope, and the honest form of a scope boundary is to SAY SO
 * — hence the dev warning below, rather than a field that quietly disagrees
 * with the page around it.
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
    }).formatToParts(sample);
    // THE BIDI MARKS IN THE LITERALS ARE KEPT, and an earlier version stripped
    // them, which was the wrong call for a reason worth writing down. Every
    // `ar-*` pattern separates its parts with U+200F followed by `/`, and those
    // marks are what make the three groups lay out right-to-left. `Time` and a
    // formatted `Table` cell render with them, because they go through
    // `Intl.format()` untouched — so stripping them here put the field in the
    // OPPOSITE visual order from every date beside it. That is this component's
    // own founding complaint, reproduced by its own hand. They cost nothing on
    // read: `toAscii` discards every non-digit, and the mask rebuilds the whole
    // string from the pattern on each keystroke, so a deleted mark comes back.
    const order = parts.map((part) => part.type).filter(isPart);

    // The locale's own numerals, 0-9 in order, so `١٢` can be read and written
    // as readily as `12`.
    const format = new Intl.NumberFormat(locale, { useGrouping: false });
    const numerals = Array.from({ length: 10 }, (_, digit) =>
      format.format(digit),
    );

    // What the locale would have used if we had not pinned it — reported, not
    // obeyed, so a consumer on a Buddhist or Persian page is told rather than
    // left to notice.
    const resolvedCalendar = new Intl.DateTimeFormat(locale).resolvedOptions()
      .calendar;

    return order.length === 3
      ? { parts, order, numerals, resolvedCalendar }
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
          resolvedCalendar,
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
    onBlur,
    form,
    placeholder,
    carrierRef,
    ref,
    'aria-describedby': describedBy,
    ...rest
  } = props;

  const formatter = useFormatter();
  const t = useMessages(dateInputMessages);
  const { parts, order, numerals, resolvedCalendar } = usePattern(
    formatter.locale,
  );

  const formatId = useId();
  const carrier = useRef<HTMLInputElement>(null);
  const field = useRef<HTMLInputElement>(null);
  // The last text this component put on screen. A change event says what the
  // field holds NOW; telling a deletion from an insertion needs what it held
  // before, and reading it back off the node is too late — the browser has
  // already applied the edit.
  const shown = useRef('');

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
  // A GREGORIAN FIELD ON A PAGE THAT IS NOT. Pinning the calendar keeps the
  // pattern clean — no era part, three fields — but it cannot reconcile the
  // YEAR: under `th-TH` a `Time` renders 2569 and this field renders 2026 for
  // the same day, and a user who types the year they just read stores a date 543
  // years out. ADR-0027 puts non-Gregorian calendars out of scope; this is the
  // scope boundary saying so out loud, where a consumer can hear it, instead of
  // the field quietly disagreeing with the page around it.
  useDevWarning(
    resolvedCalendar !== 'gregory',
    `DateInput: the locale in scope resolves to the ${resolvedCalendar} calendar, and this field is Gregorian (ADR-0027). It will show and store a Gregorian date while \`Time\` and formatted \`Table\` cells beside it show a ${resolvedCalendar} one.`,
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
  /**
   * Walk a masked string and say which part each digit belongs to, and where it
   * sits.
   *
   * The mask lays parts out in fixed slots between fixed literals, so a string
   * it produced can be read back positionally instead of being re-flowed. That
   * is the whole difference between a deletion that touches one part and one
   * that cascades through all three.
   *
   * Offsets are in CODE UNITS, because that is what `selectionStart` counts and
   * what `slice` takes — one locale (`ccp`) writes its numerals above the BMP,
   * so a digit is not always one unit wide.
   */
  const placeDigits = (text: string) => {
    const digits: {
      part: DatePart;
      ascii: string;
      at: number;
      size: number;
    }[] = [];
    let at = 0;
    for (const piece of parts) {
      if (!isPart(piece.type)) {
        if (text.startsWith(piece.value, at)) at += piece.value.length;
        continue;
      }
      let held = 0;
      while (at < text.length && held < WIDTH[piece.type]) {
        const char = String.fromCodePoint(text.codePointAt(at) ?? 0);
        const ascii = toAscii(char);
        if (ascii === '') break;
        digits.push({ part: piece.type, ascii, at, size: char.length });
        at += char.length;
        held += 1;
      }
    }
    return digits;
  };

  /**
   * A deletion, applied to the part it happened in.
   *
   * The flow mask below is right for TYPING and wrong for editing: it pours one
   * stream of digits back into the slots, so removing a digit — or a separator —
   * pulls every later digit one place forward. Measured on `12/08/2026`: one
   * Backspace over the day left `10/08/2026`, a different real day, submitted in
   * silence; deleting a separator left the digits unchanged, so the mask
   * re-emitted the same text and the key did nothing at all, for ever.
   *
   * Here the previous text is read positionally, the removed range is mapped
   * onto it, and only the digits inside that range go. Nothing after them moves.
   * A separator has no digits of its own, so Backspace over one takes the digit
   * in front of it instead, which is what every mask does and what the user
   * meant.
   */
  const applyDeletion = (
    before: string,
    typed: string,
    caret: number,
  ): { text: string; iso: string } | null => {
    const placed = placeDigits(before);
    if (placed.length === 0) return null;

    // What was cut: the span between the common prefix and the common suffix.
    let head = 0;
    while (
      head < typed.length &&
      head < before.length &&
      typed[head] === before[head]
    ) {
      head += 1;
    }
    let tail = 0;
    while (
      tail < typed.length - head &&
      tail < before.length - head &&
      typed[typed.length - 1 - tail] === before[before.length - 1 - tail]
    ) {
      tail += 1;
    }
    const from = head;
    const to = before.length - tail;
    if (to <= from) return null;

    const cut = placed.filter(
      (digit) => digit.at < to && digit.at + digit.size > from,
    );
    // Only literals were removed — take the digit in front of the cut with them.
    const removing =
      cut.length > 0
        ? cut
        : placed.filter((digit) => digit.at + digit.size === from).slice(-1);
    if (removing.length === 0) return null;

    const held = new Map<DatePart, string>();
    for (const part of order) held.set(part, '');
    for (const digit of placed) {
      if (removing.includes(digit)) continue;
      held.set(digit.part, (held.get(digit.part) ?? '') + digit.ascii);
    }

    // NO TRUNCATION HERE, unlike the flow mask. A part left short by a deletion
    // still has whole parts after it, and they are exactly what "leave the
    // others alone" means: `1/08/2026`, not `1`. Only the literals with nothing
    // left on one side of them come off, so an emptied field is empty rather
    // than a row of separators.
    const tokens = parts.map((piece) =>
      isPart(piece.type)
        ? { literal: false, value: toLocal(held.get(piece.type) ?? '') }
        : { literal: true, value: piece.value },
    );
    const filled = tokens.map((token) => !token.literal && token.value !== '');
    const first = filled.indexOf(true);
    const last = filled.lastIndexOf(true);
    const text =
      first === -1
        ? ''
        : tokens
            .slice(first, last + 1)
            .map((token) => token.value)
            .join('');

    const whole = order.every(
      (part) => (held.get(part) ?? '').length === WIDTH[part],
    );
    return {
      text,
      iso: whole
        ? (formatIsoDate({
            year: Number(held.get('year')),
            month: Number(held.get('month')),
            day: Number(held.get('day')),
          }) ?? '')
        : '',
    };
  };

  const mask = (typed: string): { text: string; iso: string } => {
    // AN ISO DATE PASTED IN IS AN ISO DATE, not eight digits to re-segment.
    // `2026-08-12` out of an API, a spreadsheet or this component's own carrier
    // was read as `20`, `02`, `6081` under `it` — complete-looking, four
    // millennia out, announced by nothing. It is the one shape that can be told
    // apart from a typed date with certainty, because nobody's locale writes a
    // four-digit run first AND separates with hyphens by accident.
    const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/.exec(typed.trim());
    if (
      iso !== null &&
      parseIsoDate(`${iso[1]}-${iso[2]}-${iso[3]}`) !== null
    ) {
      const value = `${iso[1]}-${iso[2]}-${iso[3]}`;
      return { text: display(value), iso: value };
    }

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
    // Walked as CODE POINTS with their unit offsets carried along, because
    // `selectionStart` counts units while a digit is not always one unit wide:
    // `ccp` writes its numerals above the BMP. Indexed by unit, every one of
    // them read as half a surrogate, no digit was ever counted, and the caret
    // went to the end on every keystroke — mid-string editing was impossible in
    // that locale and nowhere else.
    const points: { char: string; at: number }[] = [];
    for (let at = 0; at < masked.length;) {
      const char = String.fromCodePoint(masked.codePointAt(at) ?? 0);
      points.push({ char, at });
      at += char.length;
    }

    // ANCHORED ON THE RIGHT, and this is the whole of the function.
    //
    // Counting the digits BEFORE the caret is the obvious way and it is wrong,
    // because padding inserts a digit to their left: the `n`-th digit of the
    // masked text is then the zero the mask added, not the one the person
    // pressed, so the caret lands in FRONT of their keystroke and everything
    // after it is typed into the wrong place. Measured over all 336 dates of
    // 2026 typed in short form — `8` `/` `1` `2` `/` `2026` rather than
    // `08/12/2026` — that stored a WRONG BUT VALID date 186 times in `en-US`,
    // 172 in `it` and 132 in `ja-JP`: `8/12/2026` came out as `0261-08-22`.
    //
    // The digits to the RIGHT of the caret are the ones padding cannot move, so
    // they are what to hold on to. Same sweep, anchored this way: 13 wrong in
    // `en-US` and 0 in `ja-JP`, and the 13 are genuine short-form ambiguity —
    // `1 13 2026` and `11 3 2026` are the same digits — which no mask on one
    // field can tell apart.
    const isDigit = (char: string) => toAscii(char) !== '';
    const after = [...typed.slice(caret)].filter(isDigit).length;
    if (after === 0) return masked.length;

    let seen = 0;
    for (let index = points.length - 1; index >= 0; index -= 1) {
      const point = points[index];
      if (point === undefined || !isDigit(point.char)) continue;
      seen += 1;
      if (seen === after) return point.at;
    }
    return 0;
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
    // A HALF-TYPED VALUE IS CLEARED rather than left behind. The carrier is
    // empty until a date is whole, so an early return here left `١٢/٠٨/` on
    // screen in the OLD locale's numerals — which the new locale's reader then
    // scores as no digits at all, so the next keystroke wiped everything typed.
    // There is no ISO to redraw it from, and text in a numbering system the
    // field no longer speaks is worse than an empty field.
    if (iso === '') {
      if (element.value !== '' && shown.current !== '') {
        element.value = '';
        shown.current = '';
      }
      return;
    }
    element.value = display(iso);
    shown.current = element.value;
  }, [display]);

  // FOLLOW THE CARRIER WHEN SOMETHING ELSE WRITES IT.
  //
  // A form library setting a value does not go through this component:
  // react-hook-form's `setValue` and `reset` assign straight onto the element
  // its `register()` ref was given, which is the carrier. That fires no event,
  // records no mutation, and — measured — triggers no render either, since a
  // binding that only calls `register()` subscribes to nothing. So no effect
  // can catch it: the carrier held the new date while the user went on reading
  // the old one, and the form submitted a date that was never on screen.
  //
  // The only thing that can see an assignment is the property being assigned to.
  // React has already installed its own `value` descriptor here for its change
  // tracker, so this WRAPS whatever is on the node rather than replacing it —
  // the tracker keeps working, and the original goes back on unmount. Our own
  // writes go through the prototype setter (`setNativeValue`), so they do not
  // come back round through this.
  useEffect(() => {
    const element = carrier.current;
    if (element === null) return;
    const own = Object.getOwnPropertyDescriptor(element, 'value');
    const proto = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    );
    const set = own?.set ?? proto?.set;
    const get = own?.get ?? proto?.get;
    if (set === undefined || get === undefined) return;

    Object.defineProperty(element, 'value', {
      configurable: true,
      enumerable: own?.enumerable ?? false,
      // Bound to the element rather than to `this`: the descriptor is installed
      // on this one node and nowhere else, and the React Compiler refuses a
      // file containing a `this` it cannot follow.
      get() {
        return get.call(element) as string;
      },
      set(next: unknown) {
        set.call(element, next);
        const target = field.current;
        if (target === null) return;
        const iso = String(next);
        // Only ever repaint from a WHOLE date. An empty carrier is what a
        // half-typed field looks like, and a library clearing it mid-edit must
        // not wipe the digits under the caret.
        const text = iso === '' ? '' : display(iso);
        if (text === '' || text === target.value) return;
        target.value = text;
        shown.current = text;
      },
    });

    // AND THE OTHER DOOR: a write that arrives as an EVENT rather than as a
    // bare assignment. That is how anything outside the component sets this
    // field on purpose — `writeDateInput`, and therefore a `Calendar` in a
    // `Popover` "setting the field" as ADR-0027 says it does. It cannot use the
    // assignment path, because the only way to leave React's value tracker
    // stale enough to hear the change is the prototype setter, which by
    // definition steps over the property wrapped above.
    //
    // Guarded on the text actually differing, so the component's OWN writes —
    // which dispatch the same event on every keystroke — do not redraw the
    // field under the caret.
    const follow = () => {
      const target = field.current;
      const iso = element.value;
      if (target === null || iso === '') return;
      const next = display(iso);
      if (next === '' || next === target.value) return;
      target.value = next;
      shown.current = next;
    };
    element.addEventListener('input', follow);

    return () => {
      element.removeEventListener('input', follow);
      if (own === undefined) {
        Reflect.deleteProperty(element, 'value');
      } else {
        Object.defineProperty(element, 'value', own);
      }
    };
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
        // THE FORMAT IS DESCRIBED, not only placeheld. A placeholder is the last
        // thing an accessible description falls back to, so as soon as a `Field`
        // supplies a hint or an error, `aria-describedby` wins and the format
        // stops being announced at all — and it leaves the screen on the first
        // keystroke besides. `Field` MERGES what it is handed with its own
        // registered ids, so a hint and this coexist rather than displace each
        // other.
        aria-describedby={
          [describedBy, formatId].filter(Boolean).join(' ') || undefined
        }
        defaultValue={display(seed)}
        ref={mergeRefs(field, ref)}
        onChange={(event) => {
          const element = event.currentTarget;
          const typed = element.value;
          const caret = element.selectionStart ?? typed.length;
          // IS THIS A DELETION? The browser says so outright, and asking it is
          // the difference between reading a gesture and guessing at one:
          // "shorter than before" was the first version, and it read SELECT-ALL
          // AND RETYPE — eight digits replacing ten characters — as a deletion,
          // then applied it positionally to a string the user had just wiped.
          // `inputType` is on every `input` event a real edit produces; the
          // length test stays as the fallback for anything that synthesises one
          // without it.
          const how = (event.nativeEvent as InputEvent).inputType;
          const deleting =
            how === undefined || how === ''
              ? typed.length < shown.current.length
              : how.startsWith('delete');
          const deleted = deleting
            ? applyDeletion(shown.current, typed, caret)
            : null;
          const { text, iso } = deleted ?? mask(typed);

          // Written straight onto the node. It is uncontrolled, so React will
          // not re-render it back — and a plain assignment is right HERE,
          // unlike on the carrier: this value came from a real keystroke, so
          // React has already heard it.
          if (text !== typed) {
            element.value = text;
            const position = caretFor(text, typed, caret);
            element.setSelectionRange(position, position);
          }
          shown.current = text;

          write(iso);
          onDateChange?.(parseIsoDate(iso));
        }}
      />
      {/*
        The format, for assistive tech. Rendered as a sibling rather than as the
        field's `title`, because a `title` is also a tooltip on hover and this is
        not something to hang under the pointer.
      */}
      <span id={formatId} className={styles.format}>
        {hint}
      </span>
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
        // `form` BELONGS HERE, with the `name`, and not on the field the user
        // sees. It is what associates a control with a `<form>` it is not inside
        // — a portal, a dialog, a sticky footer — and the visible input has no
        // `name`, so putting it there associated the one node that contributes
        // nothing while the node that does stayed orphaned.
        form={form}
        defaultValue={seed}
        onChange={onChange}
        // `onBlur` follows for the same reason: a form library's blur handler
        // looks the field up BY NAME off the event target, and the visible input
        // has none, so a `mode: 'onBlur'` binding never validated this field.
        onBlur={onBlur}
        onFocus={(event) => {
          field.current?.focus();
          // IF THE HOP FAILED, LEAVE. `focus()` on an element that cannot take
          // it is a silent no-op — a consumer hiding the visible field with
          // `display:none` or `content-visibility` is enough — and focus would
          // then REST on this node: `aria-hidden`, so nothing is announced,
          // `readOnly`, so typing does nothing, and Tab resuming from somewhere
          // invisible. Better to hold no focus at all than to hold it here.
          if (document.activeElement === event.currentTarget) {
            event.currentTarget.blur();
          }
        }}
        // The carrier is a rendered, named text input now that it is focusable,
        // so a browser could offer to fill it — with a string in ITS format, not
        // ISO, which the visible field would never show.
        autoComplete="off"
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

import { useId, useMemo } from 'react';
import { Input } from '../input/input.component.js';
import { useFormatter } from '../../formatting/use-formatter.js';
import { useMessages } from '../../i18n/provider.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { useCarrierField } from '../../date/use-carrier-field.js';
import {
  formatIsoDate,
  isoDayOf,
  parseIsoDate,
} from '../../date/civil-date.js';
import {
  applyDeletion,
  caretFor,
  maskSegments,
  numeralsOf,
} from '../../date/segments.js';
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

    const numerals = numeralsOf(locale);

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
    announceFormat = true,
    ref,
    'aria-describedby': describedBy,
    ...rest
  } = props;

  // Read from `rest` rather than pulled out of it: it is the platform's own
  // attribute and it still has to reach the input, where the browser enforces
  // it. What it changes HERE is only what the field says about itself.
  const readOnly = rest.readOnly === true;
  // The hint is an instruction, so it goes wherever the field cannot be written
  // into — whether that is the platform's `readonly` or a consumer saying so.
  const saysFormat = announceFormat && !readOnly;

  const formatter = useFormatter();
  const t = useMessages(dateInputMessages);
  const { parts, order, numerals, resolvedCalendar } = usePattern(
    formatter.locale,
  );

  const formatId = useId();

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
  // THROUGH THE SAME GRAMMAR AS EVERY OTHER DOOR. This one kept the strict
  // parser after the others moved to `isoDayOf`, so the claim that there was
  // one grammar was false where it mattered most: a `defaultValues` of
  // `2026-08-12T00:00:00.000Z` — what a library holds when somebody stored a
  // `Date` — left the field empty and posted the instant, which is the very
  // sentence the datetime repair was written to retire.
  const seed = isoDayOf(asked) ?? '';

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
   * THE FRAME THIS FIELD TYPES INTO, handed to the shared mask engine.
   *
   * Everything the engine needs and nothing it does not: the locale's pattern,
   * the order of the parts, how wide each is and what it may say. The
   * arithmetic itself — the flow mask, the positional deletion, the caret
   * anchoring — lives in `segments.ts`, because `TimeInput` types into a
   * different frame with the same rules and ADR-0027 forbids a second copy of
   * them.
   */
  const frame = useMemo(
    () => ({
      parts,
      order,
      width: WIDTH,
      ceiling: CEILING,
      floor: FLOOR,
      isPart,
      toLocal: (ascii: string) =>
        [...ascii].map((char) => numerals[Number(char)] ?? char).join(''),
      toAscii: (char: string) => {
        const index = numerals.indexOf(char);
        if (index !== -1) return String(index);
        return char >= '0' && char <= '9' ? char : '';
      },
    }),
    [parts, order, numerals],
  );

  /** What a full set of parts names — the one thing the engine cannot know. */
  const compose = (held: ReadonlyMap<DatePart, string>) =>
    formatIsoDate({
      year: Number(held.get('year')),
      month: Number(held.get('month')),
      day: Number(held.get('day')),
    }) ?? '';

  const mask = (typed: string) =>
    // AN ISO DATE PASTED IN IS AN ISO DATE, not eight digits to re-segment.
    // `2026-08-12` out of an API, a spreadsheet or this component's own carrier
    // was read as `20`, `02`, `6081` under `it` — complete-looking, four
    // millennia out, announced by nothing. It is the one shape that can be told
    // apart from a typed date with certainty, because nobody's locale writes a
    // four-digit run first AND separates with hyphens by accident.
    maskSegments(frame, typed, compose, { recognise: isoDayOf, display });

  // THE CARRIER AND ITS THREE DOORS, which are not this component's to own —
  // `TimeInput` needs exactly the same ones and ADR-0027 forbids a second copy.
  // What is passed in is everything that is about DAYS rather than about the
  // machinery: how one is drawn, what any string a consumer assigns reduces to,
  // and what a whole one looks like on screen.
  const { carrier, field, shown, write, record } = useCarrierField({
    label: 'DateInput',
    seed,
    display,
    normalise: isoDayOf,
    parse: parseIsoDate,
    isWholeShown: (text) => mask(text).iso !== '',
    onValueChange: onDateChange,
  });

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
        // NOT WHEN IT CANNOT BE TYPED INTO. The hint is an instruction — "write
        // it like gg/mm/aaaa" — and a read-only field is one nobody can write
        // in, so it would be telling a reader to do something the control
        // refuses. It goes from the placeholder and from the description below
        // together, because it is one claim in two places.
        placeholder={placeholder ?? (saysFormat ? hint : undefined)}
        // THE FORMAT IS DESCRIBED, not only placeheld. A placeholder is the last
        // thing an accessible description falls back to, so as soon as a `Field`
        // supplies a hint or an error, `aria-describedby` wins and the format
        // stops being announced at all — and it leaves the screen on the first
        // keystroke besides. `Field` MERGES what it is handed with its own
        // registered ids, so a hint and this coexist rather than displace each
        // other.
        aria-describedby={
          [describedBy, saysFormat ? formatId : undefined]
            .filter(Boolean)
            .join(' ') || undefined
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
            ? applyDeletion(frame, shown.current, typed, caret, compose)
            : null;
          const { text, iso } = deleted ?? mask(typed);

          // Written straight onto the node. It is uncontrolled, so React will
          // not re-render it back — and a plain assignment is right HERE,
          // unlike on the carrier: this value came from a real keystroke, so
          // React has already heard it.
          if (text !== typed) {
            element.value = text;
            const position = caretFor(frame, text, typed, caret);
            element.setSelectionRange(position, position);
          }

          write(iso);
          // Drawn and reported from here, and both recorded together, so the
          // doors can tell a value that moved from one they have already
          // announced.
          record(text, iso);
          onDateChange?.(parseIsoDate(iso));
        }}
      />
      {/*
        The format, for assistive tech. Rendered as a sibling rather than as the
        field's `title`, because a `title` is also a tooltip on hover and this is
        not something to hang under the pointer.
      */}
      {saysFormat ? (
        <span id={formatId} className={styles.format}>
          {hint}
        </span>
      ) : null}
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

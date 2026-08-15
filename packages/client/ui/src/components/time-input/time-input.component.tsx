import { useId, useMemo, useRef } from 'react';
import { Input } from '../input/input.component.js';
import { useFormatter } from '../../formatting/use-formatter.js';
import { useMessages } from '../../i18n/provider.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { useCarrierField } from '../../date/use-carrier-field.js';
import {
  cycleHasPeriod,
  cycleRange,
  formatIsoTime,
  hourFromCycle,
  hourInCycle,
  isoTimeOf,
  parseIsoTime,
} from '../../date/civil-time.js';
import type { HourCycle } from '../../date/civil-time.js';
import {
  applyDeletion,
  caretFor,
  maskSegments,
  numeralsOf,
} from '../../date/segments.js';
import type { DrawLiteral } from '../../date/segments.types.js';
import { timeInputMessages } from './time-input.messages.js';
import type { TimePart, TimeInputProps } from './time-input.types.js';
import styles from './time-input.module.css';

const PARTS: TimePart[] = ['hour', 'minute', 'second'];

const WIDTH: Record<TimePart, number> = { hour: 2, minute: 2, second: 2 };

function isPart(type: string): type is TimePart {
  return (PARTS as string[]).includes(type);
}

/** Which half of the day, when the cycle needs telling. */
type Period = 'am' | 'pm';

/**
 * How this locale writes a time: which parts, in which order, with which
 * separators, in which digits — and in which HOUR CYCLE, which is the whole
 * reason this component exists.
 *
 * MEASURED ACROSS TWENTY LOCALES, and three of the findings shaped the code:
 *
 *   - `ko-KR` writes the day period FIRST — `오후 02:30`. A field that appended
 *     AM/PM would have been wrong in Korean and in nothing else, which is the
 *     kind of wrong nobody finds. The period is a pattern piece like any other
 *     and is drawn wherever `Intl` puts it.
 *   - `fi-FI` separates with `.`, not `:`. Nothing here writes a separator down.
 *   - `h11` is a real cycle and it is Japanese's: it writes midnight AND noon as
 *     `00`, told apart only by 午前/午後. All four cycles are handled, because a
 *     field that knew two would be wrong in the other two rather than merely
 *     incomplete.
 *
 * THE DIGITS ARE NOT PINNED, for the reason `DateInput` does not pin them: an
 * `ar-EG` page renders `٠٢:٣٠` in every `Time` beside this field.
 */
function usePattern(
  locale: string | undefined,
  asked: HourCycle | undefined,
  precision: 'minute' | 'second',
) {
  return useMemo(() => {
    const options: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
      ...(precision === 'second' ? { second: '2-digit' as const } : {}),
      ...(asked === undefined ? {} : { hourCycle: asked }),
    };
    const format = new Intl.DateTimeFormat(locale, options);
    // A fixed instant, not `now`: the pattern belongs to the locale and must
    // not depend on the minute the component happens to render.
    const parts = format.formatToParts(
      new Date(Date.UTC(2026, 7, 12, 14, 30, 45)),
    );
    // What the engine actually resolved, which is not always what was asked:
    // an unknown cycle, or none, falls back to the locale's own.
    const cycle = (format.resolvedOptions().hourCycle ?? 'h23') as HourCycle;

    // THE TWO WORDS, FROM `Intl` RATHER THAN FROM A CATALOGUE. `AM`/`PM` in
    // English, `ص`/`م` in Arabic, `午前`/`午後` in Japanese — the field shows the
    // reader the very strings it will accept, in the script it will accept them
    // in, and nothing here has to know how many locales there are.
    const wordAt = (hour: number) =>
      format
        .formatToParts(new Date(Date.UTC(2026, 7, 12, hour, 30, 45)))
        .find((piece) => piece.type === 'dayPeriod')?.value ?? '';
    const am = wordAt(9);
    const pm = wordAt(21);

    // WHICH CHARACTERS NAME WHICH HALF OF THE DAY.
    //
    // Not "the first letter": `午前` and `午後` share theirs, and so do `오전`
    // and `오후`, so a first-letter rule would have made the day period
    // untypeable in Japanese and Korean while working perfectly in English.
    // What distinguishes them is what one word has and the other has not —
    // computed, not written down.
    //
    // Latin `a`/`p` are offered as well, because a keyboard is not a locale: an
    // `ar-EG` page on a Latin keyboard would otherwise have no way to say `م`.
    // They are dropped again if the locale's own words already claim them
    // ambiguously, so a shortcut can never overrule the language.
    const amMarks = new Set([...am.toLowerCase(), 'a']);
    const pmMarks = new Set([...pm.toLowerCase(), 'p']);
    for (const mark of [...amMarks]) {
      if (pmMarks.has(mark)) {
        amMarks.delete(mark);
        pmMarks.delete(mark);
      }
    }
    // A separator is not a marker. `fi-FI` types `.` between the parts, and a
    // period word carrying `.` — Spanish writes `a. m.` — would otherwise have
    // made every separator keystroke a day-period keystroke.
    const literals = new Set(
      parts
        .filter((piece) => piece.type === 'literal')
        .flatMap((piece) => [...piece.value.toLowerCase()]),
    );
    for (const marks of [amMarks, pmMarks]) {
      for (const mark of [...marks]) {
        if (literals.has(mark) || mark.trim() === '') marks.delete(mark);
      }
    }

    return {
      parts,
      order: parts.map((piece) => piece.type).filter(isPart),
      numerals: numeralsOf(locale),
      cycle,
      am,
      pm,
      amMarks,
      pmMarks,
    };
  }, [locale, asked, precision]);
}

/**
 * A time, typed in the hour cycle the design system's locale reads.
 *
 * It exists because the platform's own `input[type=time]` cannot be told which
 * one that is (ADR-0027). Measured: the native control draws the same 24-hour
 * reading whatever locale the page declares — it follows the OPERATING SYSTEM,
 * not even the locale the engine reports — so on an `en-US` page it says
 * `14:30` beside a `Time` saying `02:30 PM`. This one follows `useFormatter()`,
 * which is the locale all of those read.
 *
 * WHAT IT STORES is `HH:mm` — or `HH:mm:ss` at second precision — on a carrier
 * beside the field, under the field's `name`. What the user SEES is that time
 * written the way their locale writes it, in their locale's digits. A server
 * never receives `02:30 PM` and has to work out which half of the day it meant.
 *
 * IT IS A CLOCK READING AND NOT AN INSTANT. There is no date here and no
 * timezone: `09:00` is when a shop opens, and it is 09:00 in every zone that
 * reads this field.
 *
 * It is one text field, so it composes like `Input`: name it with a `Field`, or
 * reach for `FormTimeInput`, which does that for you.
 */
function TimeInput(props: TimeInputProps) {
  const {
    className,
    name,
    defaultValue,
    defaultTime,
    onTimeChange,
    onChange,
    onBlur,
    form,
    placeholder,
    precision = 'minute',
    hourCycle,
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
  const saysFormat = announceFormat && !readOnly;

  const formatter = useFormatter();
  const t = useMessages(timeInputMessages);
  const { parts, order, numerals, cycle, am, pm, amMarks, pmMarks } =
    usePattern(formatter.locale, hourCycle, precision);
  const hasPeriod = cycleHasPeriod(cycle);

  const formatId = useId();

  /** The unchosen day period, shown as both of the words it may become. */
  const periodHint = hasPeriod ? `${am}/${pm}` : '';

  /**
   * `14:30` for `it`, `02:30 PM` for `en-US`, `٠٢:٣٠ م` for `ar-EG` — the ISO
   * time, localised.
   *
   * Memoised on the pattern so the carrier's effects can depend on it honestly
   * rather than on a suppression comment: a stale closure here would redraw a
   * time in the wrong cycle, which is a different time.
   */
  const display = useMemo(() => {
    const local = (ascii: string) =>
      [...ascii].map((char) => numerals[Number(char)] ?? char).join('');
    return (iso: string): string => {
      const time = parseIsoTime(iso);
      if (time === null) return '';
      const shown = hourInCycle(time.hour, cycle);
      const pad = (value: number) => local(String(value).padStart(2, '0'));
      return parts
        .map((piece) =>
          piece.type === 'hour'
            ? pad(shown.hour)
            : piece.type === 'minute'
              ? pad(time.minute)
              : piece.type === 'second'
                ? pad(time.second ?? 0)
                : piece.type === 'dayPeriod'
                  ? shown.pm
                    ? pm
                    : am
                  : piece.value,
        )
        .join('');
    };
  }, [parts, numerals, cycle, am, pm]);

  // `defaultTime` is sugar over `defaultValue`, so an explicit `defaultValue`
  // still wins — the precedence every component here gives the call site.
  const seeded =
    defaultTime === undefined ? null : formatIsoTime(defaultTime, precision);
  const asked = defaultValue ?? seeded ?? '';
  // THE CARRIER IS SEEDED THROUGH THE SAME GRAMMAR AS EVERY OTHER DOOR, which
  // is the correction the date family had to make twice: seeded raw,
  // `defaultValue="half nine"` left the field empty and posted `half nine`, and
  // seeded through the STRICT parser, a `defaultValues` of
  // `2026-08-12T09:30:00.000Z` — what a library holds when somebody stored a
  // `Date` — left the field empty and posted the instant.
  const seedTime = isoTimeOf(asked);
  const seed =
    seedTime === null ? '' : (formatIsoTime(seedTime, precision) ?? '');

  useDevWarning(
    defaultTime !== undefined && seeded === null,
    `TimeInput: \`defaultTime\` ${JSON.stringify(defaultTime)} does not name a time that exists, so the field starts empty. The hour is 0-23 whatever the reader's clock shows, and the minute is 0-59.`,
  );
  useDevWarning(
    asked !== '' && seed === '',
    `TimeInput: \`defaultValue\` ${JSON.stringify(asked)} is not an ISO time, so the field starts empty. It takes \`HH:mm\` or \`HH:mm:ss\` — the shape it stores — not the shape it shows.`,
  );

  /**
   * `hh:mm`, `hh:mm AM/PM`, `سس:دد` — the hint letters in the locale's own
   * frame, with the day period shown as the two words it may become.
   */
  const hint = parts
    .map((piece) =>
      isPart(piece.type)
        ? t(piece.type)
        : piece.type === 'dayPeriod'
          ? periodHint
          : piece.value,
    )
    .join('');

  const frame = useMemo(
    () => ({
      parts,
      order,
      width: WIDTH,
      // The hour's range is the CYCLE's, which is the whole of what makes a
      // twelve-hour field refuse a `13` and a twenty-four-hour one take it.
      ceiling: { hour: cycleRange(cycle).ceiling, minute: 59, second: 59 },
      floor: { hour: cycleRange(cycle).floor, minute: 0, second: 0 },
      isPart,
      toLocal: (ascii: string) =>
        [...ascii].map((char) => numerals[Number(char)] ?? char).join(''),
      toAscii: (char: string) => {
        const index = numerals.indexOf(char);
        if (index !== -1) return String(index);
        return char >= '0' && char <= '9' ? char : '';
      },
    }),
    [parts, order, numerals, cycle],
  );

  /**
   * WHICH HALF OF THE DAY THIS TEXT IS ALREADY SHOWING, read back off the
   * string rather than remembered in a ref.
   *
   * Derived rather than held because the field can be written from outside —
   * a form library's `setValue`, a `form.reset()`, a locale change — and a
   * remembered period would then be the one from before that write while the
   * digits beside it were the one after. Reading it back cannot go stale.
   *
   * The hint is checked FIRST because it contains both words: `AM/PM` includes
   * `PM`, so an unchosen period would otherwise read as PM and a field showing
   * nothing would name half past two in the afternoon.
   */
  const periodShown = (text: string): Period | null => {
    if (!hasPeriod) return null;
    if (periodHint !== '' && text.includes(periodHint)) return null;
    if (pm !== '' && text.includes(pm)) return 'pm';
    if (am !== '' && text.includes(am)) return 'am';
    return null;
  };

  /**
   * AND WHAT THE USER LAST SAID, for the moments when the text cannot say.
   *
   * A deletion trims the trailing word off with the digits it emptied, so a
   * Backspace in the minute of `02:30 PM` leaves `02:3` — nothing left to read
   * the period back from, and the afternoon the user had already chosen would
   * have to be chosen again on the way back to a whole time.
   *
   * THE TEXT STILL WINS whenever it has a word in it, which is what keeps this
   * from going stale: every external write redraws through `display`, which
   * always draws the period, so a `setValue`, a reset or a locale change is
   * read off the screen and never off this.
   */
  const periodHeld = useRef<Period | null>(null);
  const periodOf = (text: string): Period | null =>
    periodShown(text) ?? periodHeld.current;

  /**
   * WHICH HALF OF THE DAY THE USER JUST SAID, if they said anything.
   *
   * The words this component drew are stripped first — longest first, so `AM/PM`
   * goes before `AM` — because their own letters are markers and would
   * otherwise be re-read on every keystroke as though they had just been typed.
   * What is left is what the user actually pressed; the LAST marker in it wins,
   * so `a` then `p` ends up PM rather than refusing to move.
   */
  const readPeriod = (typed: string, current: Period | null): Period | null => {
    if (!hasPeriod) return current;
    let rest = typed;
    for (const word of [periodHint, pm, am].sort(
      (a, b) => b.length - a.length,
    )) {
      if (word !== '') rest = rest.split(word).join('');
    }
    let found: Period | null = null;
    for (const char of rest.toLowerCase()) {
      if (amMarks.has(char)) found = 'am';
      else if (pmMarks.has(char)) found = 'pm';
    }
    return found ?? current;
  };

  /** What the frame draws where the pattern is not typing a number. */
  const drawWith =
    (period: Period | null): DrawLiteral =>
    (piece) =>
      piece.type !== 'dayPeriod'
        ? piece.value
        : period === null
          ? periodHint
          : period === 'pm'
            ? pm
            : am;

  /**
   * What a full set of parts names — and NOTHING, when the cycle has a day
   * period and nobody has said which.
   *
   * A silent default would have been the easy call and it is the wrong one:
   * `02:30` with an unspoken AM is a wrong-but-valid value, which is the class
   * of defect this family keeps finding. Unchosen, the field simply does not
   * name a time yet, exactly as a half-typed minute does not.
   */
  const composeWith =
    (period: Period | null) => (held: ReadonlyMap<TimePart, string>) => {
      if (hasPeriod && period === null) return '';
      const hour = hourFromCycle(
        Number(held.get('hour')),
        cycle,
        period === 'pm',
      );
      return (
        formatIsoTime(
          {
            hour,
            minute: Number(held.get('minute')),
            ...(precision === 'second'
              ? { second: Number(held.get('second')) }
              : {}),
          },
          precision,
        ) ?? ''
      );
    };

  /**
   * AN ISO TIME PASTED IN IS AN ISO TIME, not four digits to re-segment.
   *
   * It is worth having: `14:30` pasted into an `en-US` field, re-segmented under
   * a twelve-hour ceiling, comes out as `01:43 AM` — the `4` cannot follow the
   * `1`, so it starts the minute and everything shifts.
   *
   * ONLY ON A PASTE, and this is where the date field's rule does not carry
   * over. `2026-08-12` is a shape nobody's locale types by hand, so `DateInput`
   * can recognise it at any keystroke. A TIME is not so lucky: `14:30` is
   * exactly what half the world's locales draw, so the recogniser fired on the
   * field's OWN half-typed contents — measured, typing `0`,`9`,`3`,`0` into a
   * seconds field jumped it to `09:30:00` on the fourth keystroke and the `45`
   * that followed had nowhere to land, and typing `0`,`2`,`3`,`0` into an
   * `en-US` field silently committed AM, which is the wrong-but-valid value
   * this component refuses to invent.
   *
   * The browser says outright which edits were pastes, so the answer is to ask
   * it rather than to guess from the shape.
   */
  const recognise = (typed: string): string | null => {
    const time = parseIsoTime(typed.trim());
    return time === null ? null : formatIsoTime(time, precision);
  };

  const maskWith = (typed: string, period: Period | null, pasted = false) =>
    maskSegments(frame, typed, composeWith(period), {
      ...(pasted ? { recognise, display } : {}),
      draw: drawWith(period),
    });

  const { carrier, field, shown, write, record } = useCarrierField({
    label: 'TimeInput',
    seed,
    display,
    normalise: (iso) => {
      const time = isoTimeOf(iso);
      return time === null ? null : formatIsoTime(time, precision);
    },
    parse: parseIsoTime,
    isWholeShown: (text) => maskWith(text, periodOf(text)).iso !== '',
    onValueChange: onTimeChange,
  });

  return (
    <>
      <Input
        // TEXT, NOT NUMERIC, WHEN THERE IS A DAY PERIOD TO TYPE. `inputMode`
        // decides which keyboard a phone raises, and a numeric pad has no `p`
        // on it — so a twelve-hour field with a numeric mode would have been
        // impossible to complete on the devices most people use it from.
        inputMode={hasPeriod ? 'text' : 'numeric'}
        // NO `autoComplete` of our own, for the reason `DateInput` has none: a
        // token is a CLAIM about what the field holds, and the platform has no
        // token that means "a time".
        {...rest}
        className={className}
        placeholder={placeholder ?? (saysFormat ? hint : undefined)}
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
          const period = readPeriod(typed, periodOf(shown.current));
          periodHeld.current = period;
          // IS THIS A DELETION? The browser says so outright, and asking it is
          // the difference between reading a gesture and guessing at one:
          // "shorter than before" reads SELECT-ALL AND RETYPE as a deletion and
          // then applies it positionally to a string the user has just wiped.
          const how = (event.nativeEvent as InputEvent).inputType;
          const deleting =
            how === undefined || how === ''
              ? typed.length < shown.current.length
              : how.startsWith('delete');
          const deleted = deleting
            ? applyDeletion(
                frame,
                shown.current,
                typed,
                caret,
                composeWith(period),
                drawWith(period),
              )
            : null;
          const { text, iso } =
            deleted ??
            maskWith(
              typed,
              period,
              how === 'insertFromPaste' || how === 'insertFromDrop',
            );

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
          record(text, iso);
          onTimeChange?.(parseIsoTime(iso));
        }}
      />
      {/*
        The format, for assistive tech. Rendered as a sibling rather than as the
        field's `title`, because a `title` is also a tooltip on hover and this
        is not something to hang under the pointer.
      */}
      {saysFormat ? (
        <span id={formatId} className={styles.format}>
          {hint}
        </span>
      ) : null}
      {/*
        The carrier: the field's `name`, holding `HH:mm`.

        Everything about its shape was settled by `DateInput` and measured
        there: a text input rather than `type="hidden"`, because `form.reset()`
        restores the first and not the second; hidden by CSS rather than by the
        `hidden` attribute, because it must stay FOCUSABLE for a form library's
        `register()` ref and for `FormErrorSummary`; and `aria-hidden` so it is
        never announced.
      */}
      <input
        ref={mergeRefs(carrier, carrierRef)}
        data-carrier=""
        className={styles.carrier}
        type="text"
        name={name}
        // `form` BELONGS HERE, with the `name`, and not on the field the user
        // sees: it is what associates a control with a `<form>` it is not
        // inside, and the visible input has no `name` to associate.
        form={form}
        defaultValue={seed}
        onChange={onChange}
        // `onBlur` follows for the same reason: a form library's blur handler
        // looks the field up BY NAME off the event target.
        onBlur={onBlur}
        onFocus={(event) => {
          field.current?.focus();
          // IF THE HOP FAILED, LEAVE. `focus()` on an element that cannot take
          // it is a silent no-op, and focus would then REST here: `aria-hidden`,
          // so nothing is announced, and Tab resuming from somewhere invisible.
          if (document.activeElement === event.currentTarget) {
            event.currentTarget.blur();
          }
        }}
        autoComplete="off"
        readOnly
        // Disabled together, because a disabled control is not submitted.
        // `required` is the opposite and stays on the VISIBLE field only — a
        // required carrier is an invalid control the browser cannot focus, so
        // it refuses the submit showing nothing.
        disabled={rest.disabled}
        tabIndex={-1}
        aria-hidden="true"
      />
    </>
  );
}

export { TimeInput };

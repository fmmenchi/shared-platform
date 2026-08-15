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
import type { HourCycle } from '../../date/civil-time.types.js';
import {
  applyDeletion,
  caretAfterMask,
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
    const base: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
      ...(precision === 'second' ? { second: '2-digit' as const } : {}),
    };
    // A CYCLE `Intl` DOES NOT KNOW IS DROPPED, NOT THROWN. `new
    // Intl.DateTimeFormat(locale, { hourCycle })` raises a `RangeError` for
    // anything outside the four — `'h13'`, or `'H12'`, which is a plausible
    // typo — and this call is in render, so a config-driven value would take
    // the subtree down to the nearest error boundary. Every other bad input
    // this component takes degrades and says so; this one now does too.
    // Built OUTSIDE the `try`, because the React Compiler refuses a conditional
    // inside one — "Support value blocks within a try/catch statement" is a
    // stated `Todo` of its, not a rule with a reason, so the shape moves rather
    // than the behaviour.
    const wanted: Intl.DateTimeFormatOptions =
      asked === undefined ? base : { ...base, hourCycle: asked };
    let format: Intl.DateTimeFormat;
    let refused = false;
    try {
      format = new Intl.DateTimeFormat(locale, wanted);
    } catch {
      format = new Intl.DateTimeFormat(locale, base);
      refused = true;
    }
    // A fixed instant, not `now`: the pattern belongs to the locale and must
    // not depend on the minute the component happens to render.
    const parts = format.formatToParts(
      new Date(Date.UTC(2026, 7, 12, 14, 30, 45)),
    );
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

    // THE CYCLE THE ENGINE RESOLVED — AND ONLY IF IT ALSO DREW THE PERIOD.
    //
    // A twelve-hour cycle needs a word to tell the halves apart, and one locale
    // in the sweep says twelve-hour and draws none: `fr-CM` under `h12` returns
    // `[hour][:][minute]` and no `dayPeriod` at all. Taking `resolvedOptions()`
    // at its word there gave a field where `09:30` and `21:30` are the same
    // three characters, which stores nothing until an invisible keystroke and
    // cannot read its own value back. Twenty-four hours is the honest reading of
    // a pattern with no period in it.
    const resolved = (format.resolvedOptions().hourCycle ?? 'h23') as HourCycle;
    const drawn =
      parts.some((piece) => piece.type === 'dayPeriod') &&
      am !== '' &&
      pm !== '' &&
      am !== pm;
    const cycle: HourCycle =
      cycleHasPeriod(resolved) && !drawn ? 'h23' : resolved;

    // WHICH KEYSTROKE NAMES WHICH HALF OF THE DAY — BY PREFIX, not by letter.
    //
    // An earlier version scored each character on its own and let any letter
    // shared by both words TOGGLE, so that no locale was left unable to reach a
    // half. Swept across 2704 day-period configurations, that was a disaster in
    // the locale it was least excusable in: `AM` typed into an `en-US` field
    // read `A` as morning and then `M` — shared — as "the other one", storing
    // half past two in the AFTERNOON. The field's own placeholder reads
    // `hh:mm AM/PM`, so it instructed the user to type the sequence that gives
    // the opposite value. Measured over 5408 word-typing cases: 4 wrong halves
    // before, 4215 after.
    //
    // The words are matched as words instead, a letter at a time, against a
    // buffer. A letter is only decisive while it is the prefix of ONE of them,
    // which is what the character rule was reaching for and could not express —
    // `午前`/`午後` share a first letter and differ at the second, `dop.`/`odp.`
    // share every letter and differ in ORDER, and neither is expressible as a
    // set. Latin `a`/`p` remain the fallback for a keyboard that cannot type the
    // locale's own script, and only where they match neither word.
    //
    // Only LETTERS are kept. `blo` writes its periods as `1ka`/`2ja`, and with
    // digits in the alphabet the `1` of an hour named a half of the day.
    const strip = (word: string) =>
      [...word.toLowerCase()].filter((char) => /\p{L}/u.test(char)).join('');
    const amKey = strip(am);
    const pmKey = strip(pm);

    return {
      parts,
      order: parts.map((piece) => piece.type).filter(isPart),
      numerals: numeralsOf(locale),
      cycle,
      refused,
      am,
      pm,
      amKey,
      pmKey,
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
  const { parts, order, numerals, cycle, refused, am, pm, amKey, pmKey } =
    usePattern(formatter.locale, hourCycle, precision);
  const hasPeriod = cycleHasPeriod(cycle);

  useDevWarning(
    refused,
    `TimeInput: \`hourCycle\` ${JSON.stringify(hourCycle)} is not one \`Intl\` knows, so the locale's own cycle is used instead. It takes \`h11\`, \`h12\`, \`h23\` or \`h24\`.`,
  );
  useDevWarning(
    !refused &&
      hourCycle !== undefined &&
      cycleHasPeriod(hourCycle) &&
      !hasPeriod,
    `TimeInput: \`hourCycle="${String(hourCycle)}"\` needs a day period to tell the halves of the day apart, and the locale in scope draws none — so the field reads twenty-four-hour instead. Without it, 09:30 and 21:30 would be the same three characters.`,
  );

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
    // LONGEST FIRST, so a word that contains the other cannot be read as the
    // other. `ak` writes `AN` and `ANW`, and the safe order there is luck rather
    // than design — a rule the sort makes true for every locale instead.
    for (const [word, half] of (
      [
        [periodHint, null],
        [pm, 'pm'],
        [am, 'am'],
      ] as [string, Period | null][]
    ).sort(([a], [b]) => b.length - a.length)) {
      if (word !== '' && text.includes(word)) return half;
    }
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
  /** Letters typed towards a day-period word but not yet naming one. */
  const periodTyped = useRef('');
  const periodOf = (text: string): Period | null => {
    // AN EMPTY FIELD HAS CHOSEN NOTHING. Falling back to the remembered half
    // here let a CLEARED field keep one: measured, `0230p`, then a
    // `setValue(name, '')` from a form library, then `0330` — and the box read
    // `03:30 PM` with `15:30` on the carrier, an afternoon the user had never
    // said anything about since the clear. `composeWith` below exists precisely
    // to refuse an unspoken period, and this walked around it.
    //
    // It only answers for a clear that has already LANDED, though. A
    // select-all-and-retype is still on its way in when this is asked, so the
    // text here is the one being replaced — that gesture is caught in
    // `readPeriod`, by noticing the word among the characters removed.
    if (text === '') return null;
    return periodShown(text) ?? periodHeld.current;
  };

  /**
   * WHICH HALF OF THE DAY THE USER JUST SAID, if they said anything.
   *
   * READ FROM WHAT WAS INSERTED, not from the whole field. Scanning the whole
   * string means scanning the words this component has just drawn — and an
   * earlier version dealt with that by stripping them out first, which removes
   * the one the USER pressed along with them. Measured on `ar-EG`, whose words
   * are one character each: the field draws `ص/م`, tells the reader in its own
   * placeholder that those are the strings it takes, and then ignored both.
   *
   * MATCHED AS WORDS, a letter at a time, against a buffer that survives the
   * digits between them. A letter decides only while it is the prefix of ONE
   * word; while it is a prefix of both it decides nothing and waits, which is
   * how `午前`/`午後` and `오전`/`오후` are told apart on their SECOND letter
   * rather than being guessed at on their first.
   */
  const readPeriod = (
    before: string,
    typed: string,
    current: Period | null,
    pasted: boolean,
  ): Period | null => {
    if (!hasPeriod) return current;

    // A PASTE IS A WHOLE NEW VALUE, so it is read whole and answers for itself.
    // `02:30 PM` copied out of this very field pasted back in used to come out
    // as `02:30 AM/PM` with an empty carrier — the field would not accept its
    // own output, which `DateInput` does. And no falling back to the half that
    // was there: a pasted value that names none has chosen none.
    if (pasted) {
      periodTyped.current = '';
      return periodShown(typed);
    }

    // What the browser just put in, and what it took out: the spans between the
    // common prefix and the common suffix. The same arithmetic the deletion
    // path uses, for the same reason — it is the only honest answer to "what
    // changed".
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
    const inserted = typed.slice(head, typed.length - tail);
    const removed = before.slice(head, before.length - tail);

    // DELETING THE WORD UNCHOOSES THE HALF. Select-all-and-retype takes it out
    // with everything else, and the remembered half used to survive that:
    // measured, `0230p` then select-all then `0330` stored `15:30` — an
    // afternoon nobody had mentioned since the field was wiped. Clearing the
    // same field with Backspace forgot it correctly, which made one gesture
    // disagree with another that means the same thing.
    let held = current;
    if (
      (am !== '' && removed.includes(am)) ||
      (pm !== '' && removed.includes(pm))
    ) {
      held = null;
      periodTyped.current = '';
    }

    let found: Period | null = null;
    /** Does this buffer name a half yet, and may it still grow? */
    const weigh = (buffer: string): Period | null | undefined => {
      const amStarts = amKey !== '' && amKey.startsWith(buffer);
      const pmStarts = pmKey !== '' && pmKey.startsWith(buffer);
      // An exact word wins over a prefix, so `an` names the morning in `ak`
      // even though `anw` also begins with it.
      if (buffer === amKey) return 'am';
      if (buffer === pmKey) return 'pm';
      if (amStarts && !pmStarts) return 'am';
      if (pmStarts && !amStarts) return 'pm';
      // Still ambiguous: wait for the next letter rather than guess.
      if (amStarts && pmStarts) return null;
      return undefined;
    };

    for (const char of inserted.toLowerCase()) {
      if (!/\p{L}/u.test(char)) continue;
      let buffer = periodTyped.current + char;
      let weighed = weigh(buffer);
      if (weighed === undefined) {
        // The buffer led nowhere; start again from this letter alone, so a
        // change of mind — `a` then `p` — is read as a fresh word.
        buffer = char;
        weighed = weigh(buffer);
      }
      if (weighed === undefined) {
        // AND THE LATIN FALLBACK, last, because a keyboard is not a locale: an
        // `ar-EG` page on a Latin keyboard needs a way to say `م`. It is tried
        // only where the letter matches neither word, so `sq`'s `p.d.` — which
        // is the MORNING — is never overruled by an English habit.
        periodTyped.current = '';
        if (char === 'a') found = 'am';
        else if (char === 'p') found = 'pm';
        continue;
      }
      periodTyped.current = buffer;
      if (weighed !== null) {
        found = weighed;
        // Keep the buffer only while it could still grow into the other word.
        const other = weighed === 'am' ? pmKey : amKey;
        if (!other.startsWith(buffer)) periodTyped.current = '';
      }
    }
    return found ?? held;
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
          const how = (event.nativeEvent as InputEvent).inputType;
          const pasted = how === 'insertFromPaste' || how === 'insertFromDrop';
          const period = readPeriod(
            shown.current,
            typed,
            periodOf(shown.current),
            pasted,
          );
          periodHeld.current = period;
          // IS THIS A DELETION? The browser says so outright, and asking it is
          // the difference between reading a gesture and guessing at one:
          // "shorter than before" reads SELECT-ALL AND RETYPE as a deletion and
          // then applies it positionally to a string the user has just wiped.
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
          const masked = deleted ?? maskWith(typed, period, pasted);
          const { text, iso } = masked;

          // Written straight onto the node. It is uncontrolled, so React will
          // not re-render it back — and a plain assignment is right HERE,
          // unlike on the carrier: this value came from a real keystroke, so
          // React has already heard it.
          if (text !== typed) {
            element.value = text;
            // TWO RULES, because the two edits are not the same shape. A
            // DELETION leaves the surviving digits where they were, and the
            // right-anchored count is exact. An INSERT reflows the whole
            // stream, and only the mask's own record of where each digit came
            // from puts the caret back beside the keystroke.
            const position = deleted
              ? caretFor(frame, text, typed, caret)
              : caretAfterMask(frame, typed, caret, masked);
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

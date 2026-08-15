import { useEffect, useMemo, useRef, useState } from 'react';
import { DateInput } from '../date-input/date-input.component.js';
import { InputGroup } from '../input-group/input-group.component.js';
import { Popover } from '../popover/popover.component.js';
import { PopoverTrigger } from '../popover-trigger/popover-trigger.component.js';
import { PopoverContent } from '../popover-content/popover-content.component.js';
import { Calendar } from '../calendar/calendar.component.js';
import { CalendarGlyph } from '../date-picker/calendar-glyph.component.js';
import { useMessages } from '../../i18n/provider.js';
import { useFormatter } from '../../formatting/use-formatter.js';
import { cn } from '../../util/cn.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { parseIsoDate } from '../../date/civil-date.js';
import { writeDateInput } from '../../date/write-date-input.js';
import { startOfMonth, compareDays } from '../../date/civil-math.js';
import { isWholeRange } from '../../date/civil-range.js';
import { dateRangePickerMessages } from './date-range-picker.messages.js';
import type { DateRangePickerProps } from './date-range-picker.types.js';
import type { CivilDate, CivilRange } from '../../date/civil-date.types.js';
import styles from './date-range-picker.module.css';

/**
 * A `CivilDate` as the instant `Intl` needs, built the long way round:
 * `Date.UTC(99, …)` means 1999, and a year under 100 is a real date to enter.
 */
function utc({ year, month, day }: CivilDate): Date {
  const at = new Date(0);
  at.setUTCFullYear(year, month - 1, day);
  at.setUTCHours(0, 0, 0, 0);
  return at;
}

/** Today, as a day rather than an instant. */
function today(): CivilDate {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
}

/**
 * Two date fields and one calendar, for a stay rather than a day.
 *
 *     <DateRangePicker
 *       startName="checkIn"
 *       endName="checkOut"
 *       startLabel="Check-in"
 *       endLabel="Check-out"
 *     />
 *
 * IT IS `DatePicker` WITH TWO OF EVERYTHING THE VALUE TOUCHES, and one of
 * everything else: two fields, two carriers, two names, two entries in the
 * `FormData` — and one grid, one popover, one trigger. The split is the one
 * ADR-0027 draws: a range is two VALUES, so it posts as two, and it is one
 * CHOICE, so it is made in one place.
 *
 * WHAT IT ADDS over the day picker, and neither is free:
 *
 * - **the two fields have to agree with the grid in both directions**, which is
 *   the same return path a single picker needs, twice, plus a rule for the pair
 *   a keystroke can make and a click cannot: whichever end is typed, the other
 *   goes if the two no longer name a range — in React AND on the carrier, since
 *   dropping it in one place only was measured posting the inverted pair the
 *   consumer had just been told did not exist;
 * - **the popover stays open between the two clicks**, because closing on the
 *   first would ask the user to reopen it to finish the thing they started.
 */
function DateRangePicker(props: DateRangePickerProps) {
  const {
    startName,
    endName,
    startLabel,
    endLabel,
    defaultStart,
    defaultEnd,
    onRangeChange,
    isDateDisabled,
    defaultMonth,
    firstDayOfWeek,
    placement = 'bottom-end',
    icon,
    triggerLabel,
    pickOnly = false,
    separator = '–',
    startCarrierRef,
    endCarrierRef,
    startFieldProps,
    endFieldProps,
    className,
    ...field
  } = props;

  const t = useMessages(dateRangePickerMessages);
  const formatter = useFormatter();
  const startCarrier = useRef<HTMLInputElement>(null);
  const endCarrier = useRef<HTMLInputElement>(null);
  const startField = useRef<HTMLInputElement>(null);
  const endField = useRef<HTMLInputElement>(null);
  // RAISED WHILE THIS COMPONENT WRITES ITS OWN CARRIERS. `writeDateInput`
  // dispatches a real `input` event — that is the whole point of it — so each
  // field reports the write back through `onDateChange`, which lands in
  // `typed()` holding the range from BEFORE the click. Measured without this:
  // one grid click emitted three `onRangeChange` calls, the last rebuilt from
  // the stale start, and the next click completed a range from a start the user
  // had already replaced — the start field silently rewound under them.
  const writingBoth = useRef(false);
  const [open, setOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const frozen = field.readOnly === true || field.disabled === true;
  const asTrigger = pickOnly && !frozen;

  // THE TYPING IS REFUSED ON THE NATIVE EVENT, on BOTH fields. `beforeinput` is
  // the one door every route into a value passes through — keystroke, paste,
  // drop, dictation — and React's synthetic `onBeforeInput` does not reach it,
  // measured on the day picker. Without this the fields advertised
  // `aria-haspopup` and took typing anyway, which is a promise the component
  // made and did not keep.
  useEffect(() => {
    if (!asTrigger) return;
    const nodes = [startField.current, endField.current].filter(
      (node): node is HTMLInputElement => node !== null,
    );
    const refuse = (event: Event) => event.preventDefault();
    for (const node of nodes) node.addEventListener('beforeinput', refuse);
    return () => {
      for (const node of nodes) node.removeEventListener('beforeinput', refuse);
    };
  }, [asTrigger]);

  // AND IT OPENS FROM THE KEYBOARD. A field styled and behaving as a button
  // while answering no key is an affordance a keyboard user can see and cannot
  // use — the trigger keeps the function reachable, but this is the surface
  // they are on.
  const openOnKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!asTrigger || event.defaultPrevented) return;
    if (
      event.key === 'Enter' ||
      event.key === ' ' ||
      event.key === 'ArrowDown'
    ) {
      event.preventDefault();
      setOpen(true);
    }
  };

  const seeded = useMemo<CivilRange>(
    () => ({
      start: defaultStart ? parseIsoDate(defaultStart) : null,
      end: defaultEnd ? parseIsoDate(defaultEnd) : null,
    }),
    [defaultStart, defaultEnd],
  );
  const [range, setRange] = useState<CivilRange>(seeded);
  const [month, setMonth] = useState<CivilDate>(() =>
    startOfMonth(defaultMonth ?? seeded.start ?? today()),
  );

  /** A whole date, spoken rather than written. */
  const longDate = useMemo(
    () =>
      new Intl.DateTimeFormat(formatter.locale, {
        dateStyle: 'long',
        timeZone: 'UTC',
        calendar: 'gregory',
      }),
    [formatter.locale],
  );

  const report = (next: CivilRange) => {
    setRange(next);
    if (next.start !== null) setMonth(startOfMonth(next.start));
    onRangeChange?.(next);
  };

  /**
   * Put a range on the two carriers, without hearing it come back.
   *
   * Both are written every time, in start-then-end order, so a form library
   * reading them in DOM order never sees an end without a start.
   */
  const writeBoth = (next: CivilRange) => {
    writingBoth.current = true;
    writeDateInput(startCarrier.current, next.start);
    writeDateInput(endCarrier.current, next.end);
    writingBoth.current = false;
  };

  // TYPING IS NOT CLICKING, and the difference is the whole of this function.
  //
  // A click walks `takeDay`, which knows what the previous click meant. A
  // keystroke names ONE end outright, and the other end keeps whatever it had —
  // so the pair can be made inconsistent in a way a click never can: a start
  // typed after the end, or an end typed before the start.
  //
  // The end is dropped rather than the start rewritten, and rather than the
  // keystroke refused. It is the same instinct `takeDay`'s rewind has: what the
  // user typed is what they meant, and the other end is the one that no longer
  // makes sense.
  // TWO HANDLERS, NOT A FACTORY CALLED IN RENDER. `typed('start')` was invoked
  // while rendering to produce the callback, which puts its whole body in the
  // render phase as far as the compiler is concerned — and it touches a ref, so
  // "Cannot access refs during render" was correct rather than pedantic.
  const applyTyped = (which: 'start' | 'end', date: CivilDate | null) => {
    // Our own write, coming back. Ignored here rather than guarded at the call
    // site, because it arrives through the field's ordinary report and is
    // indistinguishable from a keystroke by the time it gets here.
    if (writingBoth.current) return;

    const next =
      which === 'start'
        ? { start: date, end: range.end }
        : { start: range.start, end: date };
    if (
      next.start !== null &&
      next.end !== null &&
      compareDays(next.start, next.end) > 0
    ) {
      // THE OTHER END GOES, whichever one was typed — symmetrical, because the
      // reasoning is: what was typed is what was meant, and the end that no
      // longer makes sense is the one nobody just touched. The first version
      // wrote this branch for a typed START and returned the untouched pair for
      // a typed END, which is the same as having no rule at all: a review
      // measured `checkIn=2026-08-12, checkOut=2026-08-05` posted from it.
      const fixed =
        which === 'start'
          ? { start: date, end: null }
          : { start: null, end: date };
      // AND THE CARRIER GOES WITH IT. Dropped in React only, the DOM kept the
      // other end and the form posted the inverted range the consumer had just
      // been told did not exist.
      writeBoth(fixed);
      report(fixed);
      return;
    }
    report(next);
  };
  const startTyped = (date: CivilDate | null) => applyTyped('start', date);
  const endTyped = (date: CivilDate | null) => applyTyped('end', date);

  return (
    <InputGroup className={cn(asTrigger && styles.asTrigger, className)}>
      <DateInput
        {...field}
        {...startFieldProps}
        aria-label={startLabel}
        name={startName}
        defaultValue={defaultStart}
        // Ours AND the caller's, built inside the callback rather than during
        // render: the compiler allows `mergeRefs` under a `ref` prop and
        // refuses it under any other, and `carrierRef` is an ordinary prop that
        // happens to carry one.
        carrierRef={(node) => mergeRefs(startCarrier, startCarrierRef)(node)}
        ref={startField}
        announceFormat={!asTrigger}
        onDateChange={startTyped}
        aria-haspopup={asTrigger ? 'dialog' : undefined}
        className={cn(asTrigger && styles.asTrigger)}
        onKeyDown={openOnKey}
        onClick={() => {
          if (asTrigger) setOpen(true);
        }}
      />
      {/* Decoration, and announced by nothing: the two fields are named, and a
          dash read out between them says less than the pause already does. */}
      <span aria-hidden="true" className={styles.separator}>
        {separator}
      </span>
      <DateInput
        {...field}
        {...endFieldProps}
        aria-label={endLabel}
        name={endName}
        defaultValue={defaultEnd}
        carrierRef={(node) => mergeRefs(endCarrier, endCarrierRef)(node)}
        ref={endField}
        announceFormat={!asTrigger}
        onDateChange={endTyped}
        aria-haspopup={asTrigger ? 'dialog' : undefined}
        className={cn(asTrigger && styles.asTrigger)}
        onKeyDown={openOnKey}
        onClick={() => {
          if (asTrigger) setOpen(true);
        }}
      />
      <Popover open={open} onOpenChange={setOpen} placement={placement}>
        <PopoverTrigger
          variant="ghost"
          size="sm"
          icon={icon ?? <CalendarGlyph />}
          disabled={frozen}
          aria-label={triggerLabel ?? t('trigger')}
        />
        <PopoverContent
          aria-label={triggerLabel ?? t('trigger')}
          className={styles.surface}
        >
          <Calendar
            selection="range"
            value={range}
            month={month}
            onMonthChange={setMonth}
            isDateDisabled={isDateDisabled}
            firstDayOfWeek={firstDayOfWeek}
            onValueChange={(next) => {
              setRange(next);
              writeBoth(next);
              onRangeChange?.(next);
              // CLOSED ONLY WHEN THE RANGE IS WHOLE. Closing on the first click
              // would ask the user to reopen the calendar to finish the thing
              // they had just started.
              if (isWholeRange(next)) {
                // AND SAID OUT HERE, not in the grid. The calendar announces
                // the range as it is chosen, but that region is inside the
                // surface that is closing on this very click — a sentence set
                // on a surface going away is one a reader may never be given.
                setAnnouncement(
                  t('picked', {
                    start: longDate.format(utc(next.start)),
                    end: longDate.format(utc(next.end)),
                  }),
                );
                setOpen(false);
              }
            }}
          />
        </PopoverContent>
      </Popover>
      <span role="status" className={styles.announcement}>
        {announcement}
      </span>
    </InputGroup>
  );
}

export { DateRangePicker };

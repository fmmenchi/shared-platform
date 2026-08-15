import { useMemo, useRef, useState } from 'react';
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
 *   the same return path a single picker needs, twice, plus the rule that a
 *   typed start after the end is not a range;
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
    className,
    ...field
  } = props;

  const t = useMessages(dateRangePickerMessages);
  const formatter = useFormatter();
  const startCarrier = useRef<HTMLInputElement>(null);
  const endCarrier = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const frozen = field.readOnly === true || field.disabled === true;
  const asTrigger = pickOnly && !frozen;

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
  const typed = (which: 'start' | 'end') => (date: CivilDate | null) => {
    const next =
      which === 'start'
        ? { start: date, end: range.end }
        : { start: range.start, end: date };
    if (
      next.start !== null &&
      next.end !== null &&
      compareDays(next.start, next.end) > 0
    ) {
      report(which === 'start' ? { start: date, end: null } : next);
      return;
    }
    report(next);
  };

  return (
    <InputGroup className={cn(asTrigger && styles.asTrigger, className)}>
      <DateInput
        {...field}
        aria-label={startLabel}
        name={startName}
        defaultValue={defaultStart}
        carrierRef={startCarrier}
        announceFormat={!asTrigger}
        onDateChange={typed('start')}
        aria-haspopup={asTrigger ? 'dialog' : undefined}
        className={cn(asTrigger && styles.asTrigger)}
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
        aria-label={endLabel}
        name={endName}
        defaultValue={defaultEnd}
        carrierRef={endCarrier}
        announceFormat={!asTrigger}
        onDateChange={typed('end')}
        aria-haspopup={asTrigger ? 'dialog' : undefined}
        className={cn(asTrigger && styles.asTrigger)}
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
              // BOTH CARRIERS, always, and in this order — the start first, so
              // a form library reading them in DOM order never sees an end
              // without a start. `writeDateInput` reports through each field's
              // own `onDateChange`, which would then walk `typed()` and undo
              // half of this, so the fields are written and the state is set
              // here rather than let round back through them.
              writeDateInput(startCarrier.current, next.start);
              writeDateInput(endCarrier.current, next.end);
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

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { cn } from '../../util/cn.js';
import { Button } from '../button/button.component.js';
import { useControlled } from '../../primitives/use-controlled.js';
import { useFormatter } from '../../formatting/use-formatter.js';
import { useMessages } from '../../i18n/provider.js';
import { formatIsoDate } from '../../date/civil-date.js';
import {
  addDays,
  addMonths,
  daysInMonth,
  isSameDay,
  startOfMonth,
  startOfWeek,
} from '../../date/civil-math.js';
import { calendarMessages } from './calendar.messages.js';
import { calendarVariants } from './calendar.variants.js';
import type { CalendarProps } from './calendar.types.js';
import type { CivilDate } from '../../date/civil-date.types.js';
import styles from './calendar.module.css';

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
 * Which weekday a row starts on.
 *
 * `getWeekInfo()` is Baseline Newly and shipped in two shapes — a method on some
 * engines, a getter on others — so it is called defensively and the answer is
 * converted: the standard numbers Monday 1 through Sunday 7, and everything else
 * in this component numbers Sunday 0 through Saturday 6, as `Date` does.
 *
 * ADR-0017 admits a Newly feature that DEGRADES, and this one does: without it
 * the grid still works and the week simply starts where the fallback says.
 */
function weekStart(locale: string | undefined, asked: number | undefined) {
  if (asked !== undefined) return asked;
  try {
    const info = new Intl.Locale(locale ?? 'en') as Intl.Locale & {
      weekInfo?: { firstDay?: number };
      getWeekInfo?: () => { firstDay?: number };
    };
    const first = info.getWeekInfo?.().firstDay ?? info.weekInfo?.firstDay;
    if (typeof first === 'number') return first % 7;
  } catch {
    // An engine without it, or a locale it cannot parse. The fallback is the
    // point of the try, not an error worth reporting to a consumer.
  }
  return 1;
}

/**
 * A month of days, for picking one.
 *
 * It exists because of the one thing no native date control offers and none
 * will: **per-date disabling**. `min`/`max` are an interval, not a set, so
 * "only these slots", "never on a Tuesday", "these three are booked" cannot be
 * said to a platform date input at all (ADR-0027). `isDateDisabled` is a
 * predicate, and it is the whole reason this component is worth its weight.
 *
 * THE ROVING FOCUS IS A DATE, NOT A CELL. Arrows move by a day and a week,
 * PageUp/PageDown by a month, Shift with them by a year — and any of those can
 * cross into a month that is not on screen, which re-renders the grid
 * underneath the focus. So the component holds the focused DAY, and an effect
 * puts focus on whichever cell now carries it. A cell index would name a
 * different day after every such move.
 */
function Calendar(props: CalendarProps) {
  const {
    className,
    value,
    defaultValue,
    onValueChange,
    month,
    defaultMonth,
    onMonthChange,
    isDateDisabled,
    firstDayOfWeek,
    ...rest
  } = props;

  const formatter = useFormatter();
  const t = useMessages(calendarMessages);
  const captionId = useId();
  const grid = useRef<HTMLTableElement>(null);

  const [selected, setSelected] = useControlled<CivilDate | null>({
    value,
    defaultValue: defaultValue ?? null,
    onChange: (next) => {
      if (next !== null) onValueChange?.(next);
    },
    name: 'Calendar',
  });

  const [shown, setShown] = useControlled<CivilDate>({
    value: month,
    defaultValue: startOfMonth(defaultMonth ?? selected ?? today()),
    onChange: onMonthChange,
    name: 'Calendar',
  });

  // The day the arrows are on. It starts on the selection, or on the first of
  // the month — never on "today" when today is elsewhere, since arrowing into a
  // grid should not begin by scrolling it somewhere else.
  const [focused, setFocused] = useState<CivilDate>(
    () => selected ?? startOfMonth(shown),
  );
  // Whether the focus belongs in the grid at all. Moving to a cell that nobody
  // asked for would steal focus on first paint, so it only ever follows a key.
  const roving = useRef(false);

  const firstDay = weekStart(formatter.locale, firstDayOfWeek);

  const { weeks, weekdays, monthLabel } = useMemo(() => {
    const start = startOfWeek(startOfMonth(shown), firstDay);
    const length = daysInMonth(shown.year, shown.month);
    // Six rows always, so the grid does not change height between months — a
    // calendar that resizes under the pointer moves the day you were aiming at.
    const cells = Array.from({ length: 42 }, (_, index) =>
      addDays(start, index),
    );
    const rows: CivilDate[][] = [];
    for (let index = 0; index < cells.length; index += 7) {
      rows.push(cells.slice(index, index + 7));
    }

    const day = new Intl.DateTimeFormat(formatter.locale, {
      weekday: 'short',
      timeZone: 'UTC',
      calendar: 'gregory',
    });
    const long = new Intl.DateTimeFormat(formatter.locale, {
      weekday: 'long',
      timeZone: 'UTC',
      calendar: 'gregory',
    });
    // A known Sunday, walked forward — the weekday names belong to the locale
    // and their ORDER to `firstDayOfWeek`, so neither is written down here.
    const sunday = Date.UTC(2026, 1, 1);
    const names = Array.from({ length: 7 }, (_, index) => {
      const at = new Date(sunday + ((index + firstDay) % 7) * 86400000);
      return { short: day.format(at), long: long.format(at) };
    });

    return {
      weeks: rows,
      weekdays: names,
      monthLabel: new Intl.DateTimeFormat(formatter.locale, {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
        calendar: 'gregory',
      }).format(new Date(Date.UTC(shown.year, shown.month - 1, 1))),
      length,
    };
  }, [shown, firstDay, formatter.locale]);

  // PUT FOCUS ON WHATEVER CELL NOW HOLDS THE FOCUSED DAY. This is the half that
  // makes a date-shaped roving focus work: crossing a month boundary replaces
  // every cell in the grid, so the element to focus does not exist until after
  // the render that the key triggered.
  useEffect(() => {
    if (!roving.current) return;
    const iso = formatIsoDate(focused);
    const cell = grid.current?.querySelector<HTMLButtonElement>(
      `[data-day="${iso ?? ''}"]`,
    );
    cell?.focus();
  }, [focused]);

  const goTo = (next: CivilDate) => {
    roving.current = true;
    setFocused(next);
    if (next.year !== shown.year || next.month !== shown.month) {
      setShown(startOfMonth(next));
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTableElement>) => {
    const step: Record<string, () => CivilDate> = {
      ArrowLeft: () => addDays(focused, -1),
      ArrowRight: () => addDays(focused, 1),
      ArrowUp: () => addDays(focused, -7),
      ArrowDown: () => addDays(focused, 7),
      Home: () => startOfWeek(focused, firstDay),
      End: () => addDays(startOfWeek(focused, firstDay), 6),
      PageUp: () => addMonths(focused, event.shiftKey ? -12 : -1),
      PageDown: () => addMonths(focused, event.shiftKey ? 12 : 1),
    };
    const move = step[event.key];
    if (move === undefined) return;
    event.preventDefault();
    goTo(move());
  };

  return (
    <div className={cn(calendarVariants(), className)} {...rest}>
      <div className={styles.header}>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={t('previous')}
          onClick={() => setShown(addMonths(shown, -1))}
        >
          ‹
        </Button>
        <span id={captionId} className={styles.month}>
          {monthLabel}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={t('next')}
          onClick={() => setShown(addMonths(shown, 1))}
        >
          ›
        </Button>
      </div>

      {/* THE MONTH CHANGES IN SILENCE OTHERWISE. Everything under the header is
          replaced and nothing moves that a reader who cannot see it would
          notice — the same silent change sorting a table has. One polite
          sentence per month, not one per keystroke. */}
      <span role="status" className={styles.announcement}>
        {t('month', { month: monthLabel })}
      </span>

      <table
        ref={grid}
        role="grid"
        aria-labelledby={captionId}
        className={styles.grid}
        onKeyDown={onKeyDown}
      >
        <thead>
          <tr>
            {weekdays.map((weekday) => (
              // TWO SPANS, and axe is what settled it: `abbr` alone left the
              // header with no accessible text at all (`empty-table-header`),
              // because an `aria-hidden` child contributes nothing and `abbr`
              // is not a naming attribute — it is a hint some engines use and
              // most ignore. The eye gets "lun", a reader gets "lunedì", and
              // `abbr` stays for the engines that do read it.
              <th key={weekday.long} scope="col" abbr={weekday.long}>
                <span aria-hidden="true">{weekday.short}</span>
                <span className={styles.announcement}>{weekday.long}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={formatIsoDate(week[0] as CivilDate)}>
              {week.map((day) => {
                const iso = formatIsoDate(day);
                const outside = day.month !== shown.month;
                const isSelected =
                  selected !== null && isSameDay(day, selected);
                const disabled = isDateDisabled?.(day) ?? false;
                return (
                  <td key={iso} role="gridcell" aria-selected={isSelected}>
                    <button
                      type="button"
                      data-day={iso}
                      data-outside={outside || undefined}
                      data-selected={isSelected || undefined}
                      className={styles.day}
                      // ONE STOP FOR THE WHOLE GRID. Tab reaches the calendar
                      // once and the arrows do the rest, which is the grid
                      // contract — forty-two tab stops is not navigation.
                      tabIndex={isSameDay(day, focused) ? 0 : -1}
                      // `aria-disabled` rather than `disabled`: the APG's
                      // "focusable but not activatable". A `disabled` button is
                      // out of the accessibility tree, so the arrows would walk
                      // over days a reader is never told exist.
                      aria-disabled={disabled || undefined}
                      onClick={() => {
                        if (disabled) return;
                        roving.current = true;
                        setFocused(day);
                        setSelected(day);
                      }}
                      onFocus={() => setFocused(day)}
                    >
                      {day.day}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { Calendar };

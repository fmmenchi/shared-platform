import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { cn } from '../../util/cn.js';
import { Button } from '../button/button.component.js';
import { useControlled } from '../../primitives/use-controlled.js';
import {
  useCopyFormatter,
  useFormatter,
} from '../../formatting/use-formatter.js';
import { useDirection, useMessages } from '../../i18n/provider.js';
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

/**
 * A `Date` for a civil date, in UTC, without the two-digit-year trap.
 *
 * `Date.UTC(99, …)` means 1999 — the exact trap `civil-date.ts` documents
 * avoiding and `civil-math.ts` avoids, and which the month caption walked
 * straight into: the grid rendered the year 99 while the heading above it said
 * 1999. Every `Intl` call in this file goes through here.
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
  const copy = useCopyFormatter();
  const direction = useDirection();
  const t = useMessages(calendarMessages);
  const captionId = useId();
  const grid = useRef<HTMLTableElement>(null);
  // Read ONCE. `today()` calls `new Date()`, so leaving it in the render body
  // made every pass impure for a value that moves at most once a day.
  const [now] = useState(today);
  // What the live region says, and nothing on the first pass — the same shape
  // `TableToolbar` uses, for the same measured reason. The ref is read only
  // inside the effect: read during render it would be ref access in render,
  // which the React Compiler refuses outright.
  const [announcement, setAnnouncement] = useState('');
  const arrived = useRef(false);
  /** The locale's numerals, so a day is written the way its month is. */
  const digits = useMemo(
    () => new Intl.NumberFormat(formatter.locale, { useGrouping: false }),
    [formatter.locale],
  );
  /** A whole date, for a cell's accessible name. */
  const longDate = useMemo(
    () =>
      new Intl.DateTimeFormat(formatter.locale, {
        dateStyle: 'long',
        timeZone: 'UTC',
        calendar: 'gregory',
      }),
    [formatter.locale],
  );

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

  /**
   * The month name for the SENTENCE, which is not the same locale as the month
   * name for the caption.
   *
   * The caption is a value and takes the reader's locale. The announcement is
   * design-system copy with a value in it, and `useCopyFormatter` exists for
   * exactly that: under `fr-FR`, with no French catalogue, the sentence falls
   * back to English while the month would not — "Showing août 2026". Every other
   * component here that interpolates a value into its own copy uses it.
   */
  const announcedMonth = useMemo(
    () =>
      new Intl.DateTimeFormat(copy.locale, {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
        calendar: 'gregory',
      }).format(utc(startOfMonth(shown))),
    [copy.locale, shown],
  );

  const firstDay = weekStart(formatter.locale, firstDayOfWeek);

  const { weeks, weekdays, monthLabel } = useMemo(() => {
    const start = startOfWeek(startOfMonth(shown), firstDay);
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
      }).format(utc(startOfMonth(shown))),
    };
  }, [shown, firstDay, formatter.locale]);

  /**
   * The day that actually carries the tab stop.
   *
   * `focused` and `shown` are two pieces of state and NOTHING kept them in the
   * same month: `defaultValue` in January with `defaultMonth` in August put the
   * focused day outside the rendered window on the very first paint, and two
   * clicks of the previous-month button did it with no props at all. Every cell
   * is then `tabIndex={-1}` and the whole grid drops out of the tab order —
   * unreachable by keyboard, with nothing on screen to say so.
   *
   * Derived rather than corrected, so the invariant cannot be broken again by a
   * new route into `shown`: whatever moves the month, the tab stop follows it.
   * The `Menubar` next door defends the same failure a different way, for the
   * same reason — "a bar whose last-used command has just unmounted, where
   * nothing would carry the `0`".
   */
  const focusable = useMemo(() => {
    const inWindow = weeks.some((week) =>
      week.some((day) => isSameDay(day, focused)),
    );
    if (inWindow) return focused;
    return {
      year: shown.year,
      month: shown.month,
      day: Math.min(focused.day, daysInMonth(shown.year, shown.month)),
    };
  }, [weeks, focused, shown]);

  // The month changed, so say so — but never on arrival, which is not news.
  useEffect(() => {
    if (!arrived.current) {
      arrived.current = true;
      return;
    }
    setAnnouncement(t('month', { month: announcedMonth }));
  }, [announcedMonth, t]);

  // PUT FOCUS ON WHATEVER CELL NOW HOLDS THE FOCUSED DAY. This is the half that
  // makes a date-shaped roving focus work: crossing a month boundary replaces
  // every cell in the grid, so the element to focus does not exist until after
  // the render that the key triggered.
  //
  // IT DEPENDS ON THE GRID AS WELL AS THE DAY. Keyed on the day alone, a month
  // that arrived one render late — a consumer holding `month` in a transition,
  // a store, a URL — left the cell unfound, `cell?.focus()` doing nothing, and
  // the old button unmounting with focus on it, which drops focus to `<body>`
  // and never restores it.
  useEffect(() => {
    if (!roving.current) return;
    const iso = formatIsoDate(focusable);
    const cell = grid.current?.querySelector<HTMLButtonElement>(
      `[data-day="${iso ?? ''}"]`,
    );
    cell?.focus();
  }, [focusable, weeks]);

  const goTo = (next: CivilDate) => {
    // INSIDE THE CONTRACT, or not at all. `formatIsoDate` refuses a year outside
    // 0-9999, and the grid is built from what it returns: past the edge,
    // `data-day` disappeared from every spilled cell, the focus effect's
    // selector became `[data-day=""]` and matched nothing, and `<td key={null}>`
    // gave React duplicate keys — measured, nine such cells appear in December
    // 9999 on first paint. A wall is better than a silent unravelling.
    if (next.year < 1 || next.year > 9999) return;
    roving.current = true;
    setFocused(next);
    if (next.year !== shown.year || next.month !== shown.month) {
      setShown(startOfMonth(next));
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTableElement>) => {
    // A MODIFIER MEANS THE BROWSER, NOT THE GRID. Alt+Left is Back and
    // Cmd+Up is the top of the document; swallowing those to move the ring one
    // day is taking a key that was never offered. Shift is the exception,
    // because the grid contract gives it a meaning of its own below.
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    // THE ARROWS ARE VISUAL, SO THEY FOLLOW THE DIRECTION. A table in an RTL
    // subtree lays its columns right to left, so yesterday is drawn on the
    // RIGHT — and ArrowRight moving to tomorrow would move the ring visually
    // backwards. The rest of this package settles the same question with
    // `inlineEnd`, and this component ships Arabic copy, so RTL is a target and
    // not a hypothetical.
    const forward = direction === 'rtl' ? -1 : 1;

    // From the day that CARRIES THE RING, not from the one in state: after a
    // month button has moved the grid out from under it, those are not the same
    // date, and continuing from the invisible one moves the ring somewhere the
    // user did not ask for.
    const from = focusable;
    const step: Record<string, () => CivilDate> = {
      ArrowLeft: () => addDays(from, -forward),
      ArrowRight: () => addDays(from, forward),
      ArrowUp: () => addDays(from, -7),
      ArrowDown: () => addDays(from, 7),
      Home: () => startOfWeek(from, firstDay),
      End: () => addDays(startOfWeek(from, firstDay), 6),
      PageUp: () => addMonths(from, event.shiftKey ? -12 : -1),
      PageDown: () => addMonths(from, event.shiftKey ? 12 : 1),
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
          // The updater form, which is what `useControlled` exists to make
          // available: two clicks in one tick both computed from the same
          // rendered `shown` would lose the first, and a consumer deferring
          // their own update makes that window real rather than theoretical.
          onClick={() => setShown((prev) => addMonths(prev, -1))}
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
          onClick={() => setShown((prev) => addMonths(prev, 1))}
        >
          ›
        </Button>
      </div>

      {/* THE MONTH CHANGES IN SILENCE OTHERWISE. Everything under the header is
          replaced and nothing moves that a reader who cannot see it would
          notice — the same silent change sorting a table has. One polite
          sentence per month, not one per keystroke. */}
      <span role="status" className={styles.announcement}>
        {/* EMPTY ON THE FIRST PASS. A live region inserted with its sentence
            already in it is the canonical case a screen reader does not speak —
            measured in this package once already, which is why `TableToolbar`
            keeps the same `arrived` ref. Mounted inside a `Popover`, which is
            the picker composition this component is for, a populated region
            also fires on top of the popover's own announcement. */}
        {announcement}
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
          {/* KEYED BY POSITION, not by the ISO string. `formatIsoDate` returns
              `null` outside 0-9999, and `key={null}` is the string `"null"` for
              every such row and cell — React then sees duplicates, which is
              already true of December 9999 on first paint. The window is always
              42 consecutive days in six rows, so the index IS the identity. */}
          {weeks.map((week, row) => (
            <tr key={row}>
              {week.map((day, column) => {
                const iso = formatIsoDate(day);
                const outside = day.month !== shown.month;
                const isSelected =
                  selected !== null && isSameDay(day, selected);
                const disabled = isDateDisabled?.(day) ?? false;
                return (
                  // `|| undefined`, so forty-one cells do not each carry
                  // `aria-selected="false"`. Rendered, every cell claimed a
                  // selection state and a reader announced "not selected" on
                  // each one as the arrows walked the month. The twin data
                  // attribute below already used this idiom.
                  <td
                    key={column}
                    role="gridcell"
                    aria-selected={isSelected || undefined}
                  >
                    <button
                      type="button"
                      data-day={iso}
                      data-outside={outside || undefined}
                      data-selected={isSelected || undefined}
                      className={styles.day}
                      // ONE STOP FOR THE WHOLE GRID. Tab reaches the calendar
                      // once and the arrows do the rest, which is the grid
                      // contract — forty-two tab stops is not navigation.
                      tabIndex={isSameDay(day, focusable) ? 0 : -1}
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
                      // THE WHOLE DATE, because the visible text is a bare
                      // number and the column header only adds a weekday. A
                      // reader arrowing off the 31st heard "Tuesday, 1" and was
                      // never told which month they had landed in — the polite
                      // status below says so eventually, and is skipped
                      // entirely by anyone who keeps arrowing.
                      aria-label={longDate.format(utc(day))}
                      // The platform's own "you are here". Without it a calendar
                      // has no today at all: it was used to pick the opening
                      // month and then never mentioned again.
                      aria-current={isSameDay(day, now) ? 'date' : undefined}
                      data-today={isSameDay(day, now) || undefined}
                    >
                      {/* THROUGH `Intl`, not `String(n)`. Measured on `ar-EG`:
                          the caption above read `أغسطس ٢٠٢٦` while every cell
                          under it read `12` — the same component in two
                          numbering systems, which is the mismatch this family
                          exists to remove, one layer down. */}
                      {digits.format(day.day)}
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

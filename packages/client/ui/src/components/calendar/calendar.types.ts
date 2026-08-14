import type { ComponentPropsWithRef } from 'react';
import type { CivilDate } from '../../date/civil-date.types.js';

interface CalendarOwnProps {
  /**
   * The selected day, if there is one. Controlled — unlike the fields in this
   * package, and for the opposite reason: a calendar has no DOM home for its
   * value. There is no `<input>` under it holding a day, so React is the only
   * place the selection can live (ADR-0013 draws the line at "controls the
   * browser draws"; this one is drawn by us).
   */
  value?: CivilDate | null;
  /** The starting selection when the consumer does not hold it. */
  defaultValue?: CivilDate | null;
  /** Fires when a day is chosen. */
  onValueChange?: (value: CivilDate) => void;
  /**
   * Which month is on screen. Controlled if given, so a consumer can drive the
   * calendar from their own navigation; otherwise the component keeps it.
   */
  month?: CivilDate;
  /** The month to open on. Defaults to the selected day's, or to today's. */
  defaultMonth?: CivilDate;
  /**
   * Fires when the shown month changes, by button or by keyboard.
   *
   * **A selection that moves from outside does NOT move the month by itself.**
   * A date typed into the field beside the grid, a `setValue`, a restored URL —
   * each can land on a day this month does not draw, and the calendar would then
   * show nothing selected. Whoever moves `value` moves `month` with it:
   *
   *     <Calendar value={picked} month={month} onMonthChange={setMonth} />
   *
   * That is a decision, not an omission. Following the selection from inside
   * means writing state in an effect on every value change, which fights the
   * navigation the user just made — and the tab stop has to move with it, which
   * is a plain `useState` setter and exactly what the `react-hooks` lint refuses
   * in an effect body.
   *
   * (An earlier version of this comment said `useControlled` forbids it too.
   * That was wrong and is withdrawn: `use-controlled.ts` documents only that its
   * internal ref is never written during RENDER, there is no guard against an
   * effect, and a probe measured zero lint errors for a `useControlled` setter
   * called from one. The refusal was about the tab stop, not the month.)
   *
   * The one place that knows whether the value moved because of the grid or in
   * spite of it is the thing holding both.
   */
  onMonthChange?: (month: CivilDate) => void;
  /**
   * WHICH DAYS CANNOT BE CHOSEN — and the reason this component exists at all.
   *
   * `min`/`max` on the platform's date input are an interval, not a set, so
   * "only these slots", "never on a Tuesday", "these three are booked" are not
   * expressible there (ADR-0027). A predicate is.
   *
   * A disabled day stays FOCUSABLE and is announced as disabled, which is the
   * APG's "focusable but not activatable": arrows that skipped it would be
   * arrows that never tell a screen-reader user it is there.
   */
  isDateDisabled?: (date: CivilDate) => boolean;
  /**
   * Which weekday a row starts on, 0 for Sunday through 6 for Saturday.
   *
   * Defaults to what `Intl.Locale.prototype.getWeekInfo()` reports for the
   * locale in scope, and to Monday where that is missing — the API is Baseline
   * Newly and shipped in two incompatible shapes, which passes ADR-0017's test
   * for a Newly feature precisely because it degrades: without it the grid still
   * works, the week simply starts where the fallback says, and a consumer who
   * cares states the prop.
   */
  firstDayOfWeek?: number;
}

/**
 * Public `Calendar` props.
 *
 * A month of days as a grid, for picking one. It ships standalone — a booking
 * screen wants a bare calendar — and composes inside a `Popover` for the picker
 * shape, where it SETS a field rather than replacing it (ADR-0027).
 *
 * Gregorian, one date, no time and no timezone: the value is a `CivilDate`,
 * `{ year, month, day }`, which is a day and not an instant.
 */
export type CalendarProps = CalendarOwnProps &
  // `children` comes off, as it does on eighteen siblings here: the grid is
  // drawn from the month, so anything passed as content would typecheck and
  // then be discarded by JSX without a word.
  Omit<ComponentPropsWithRef<'div'>, keyof CalendarOwnProps | 'children'>;

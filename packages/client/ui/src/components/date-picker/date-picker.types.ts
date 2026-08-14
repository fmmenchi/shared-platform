import type { ComponentProps, ReactNode } from 'react';
import type { Placement } from '@floating-ui/dom';
import type { DateInput } from '../date-input/date-input.component.js';
import type { CivilDate } from '../../date/civil-date.types.js';

/**
 * A `DateInput` with a `Calendar` in a `Popover` behind it, wired.
 *
 * The props are `DateInput`'s, plus the few the calendar needs. Nothing here is
 * a second way to say something the field already says: the value, the name and
 * the disabled state stay where they were, and this component adds only what a
 * grid needs to know.
 */
export type DatePickerProps = Omit<
  ComponentProps<typeof DateInput>,
  // The picker holds this one: it needs the carrier to write the field when a
  // day is chosen. A consumer who wants the node as well can still have it —
  // see `carrierRef` below, which is re-declared rather than dropped.
  'carrierRef'
> & {
  /**
   * The node holding the ISO value, if you need it too.
   *
   * The picker keeps its own reference to it regardless; yours is merged in.
   * You should rarely want this — it exists because the field it names is the
   * one a form library binds to, and taking that away with no way back would be
   * a door closed for no reason.
   */
  carrierRef?: ComponentProps<typeof DateInput>['carrierRef'];
  /**
   * WHICH DAYS CANNOT BE CHOSEN, and the reason the calendar exists at all.
   *
   * `min`/`max` on the platform's date input are an interval, not a set, so
   * "never on a Tuesday" and "these three are booked" are not expressible there.
   * A predicate is. It refuses days in the GRID only — a date typed into the
   * field is not blocked by it, because a half-typed date passes through every
   * intermediate value on its way to a valid one and refusing them as they are
   * typed makes the field unusable. Validate on submit as you would anyway.
   */
  isDateDisabled?: (date: CivilDate) => boolean;
  /** The month the calendar opens on. Defaults to the selected day's, or today's. */
  defaultMonth?: CivilDate;
  /**
   * Which weekday a row starts on, 0 for Sunday through 6 for Saturday.
   * Defaults to what the declared locale reports.
   */
  firstDayOfWeek?: number;
  /** Preferred side of the field for the popover. Defaults to `bottom-end`. */
  placement?: Placement;
  /**
   * What the trigger draws. Defaults to a calendar glyph drawn by this package.
   *
   * An icon set is brand identity and lives app-side, so the default is one
   * shape in `currentColor` rather than a dependency — and a consumer with their
   * own set passes it here.
   */
  icon?: ReactNode;
  /**
   * The trigger's accessible name. Defaults to the design system's own words in
   * the declared locale.
   *
   * It is a NAME and not a tooltip: the button draws a glyph, so without one it
   * would announce as "button" and nothing else.
   */
  triggerLabel?: string;
};

import type { ComponentProps, ReactNode } from 'react';
import type { Placement } from '@floating-ui/dom';
import type { DateInput } from '../date-input/date-input.component.js';
import type { CivilDate, CivilRange } from '../../date/civil-date.types.js';

/**
 * TWO FIELDS AND ONE CALENDAR — the props a range takes that a day does not.
 *
 * What it borrows from `DateInput` is deliberately narrow: `disabled`,
 * `required`, `readOnly` and the aria attributes apply to BOTH fields, and
 * anything that names one value (`name`, `defaultValue`, `onChange`) has to be
 * given twice or not at all, so those are re-declared below rather than
 * inherited.
 */
type SharedFieldProps = Pick<
  ComponentProps<typeof DateInput>,
  'disabled' | 'required' | 'readOnly' | 'form' | 'size' | 'className'
>;

export type DateRangePickerProps = SharedFieldProps & {
  /**
   * The name the START posts under, and the name the END does.
   *
   * TWO NAMES, TWO ENTRIES, because a range is two values (ADR-0027). One name
   * carrying both would break the promise the whole family is built on — one
   * field, one name, one value a server never has to parse — and a `FormData`
   * with two entries under one key is a shape every backend reads differently.
   */
  startName: string;
  endName: string;
  /**
   * The accessible name of each field.
   *
   * NOT a `Field` around the pair. `Field` gives its control an id and expects
   * one control to take it — measured with two, both inputs carried the SAME
   * id, its `<label for>` matched two elements, the label named neither (the
   * aria-labels win), and axe saw nothing because its duplicate-id rules are
   * deprecated. Two labelled controls are a GROUP, so the shell is `Fieldset` +
   * `FieldsetLegend`, which is what this package already has for one.
   */
  startLabel: string;
  endLabel: string;
  /** The starting range, in ISO. Either end may be absent. */
  defaultStart?: string;
  defaultEnd?: string;
  /**
   * Fires whenever either end moves — from the grid, from a keystroke, or from
   * a write that arrives from outside.
   *
   * It reports the range as it stands, half made included: the first click
   * hands back `{ start, end: null }`, so a consumer can draw that state rather
   * than waiting in the dark for the second.
   */
  onRangeChange?: (range: CivilRange) => void;
  /**
   * WHICH DAYS CANNOT BE CHOSEN, asked of the grid only.
   *
   * A date typed into either field passes through every intermediate value on
   * its way to a valid one, so refusing them as they are typed would make the
   * fields unusable. Validate on submit as you would anyway.
   */
  isDateDisabled?: (date: CivilDate) => boolean;
  /** The month the calendar opens on. Defaults to the start's, or today's. */
  defaultMonth?: CivilDate;
  /** Which weekday a row starts on. Defaults to what the declared locale reports. */
  firstDayOfWeek?: number;
  /** Preferred side of the field for the popover. Defaults to `bottom-end`. */
  placement?: Placement;
  /** What the trigger draws. Defaults to a calendar glyph drawn by this package. */
  icon?: ReactNode;
  /** The trigger's accessible name, in the declared locale by default. */
  triggerLabel?: string;
  /**
   * NEITHER FIELD IS TYPED INTO — both become the calendar's trigger.
   *
   * The same rule `DatePicker` states: a field that can be typed into has a
   * caret to protect, so the trigger is a separate target; one that cannot has
   * nothing to protect, so the field itself is the target. A prop of ours
   * rather than the platform's `readonly`, which means "the user cannot modify
   * this value" and would be false while the calendar modifies it.
   */
  pickOnly?: boolean;
  /** The text between the two fields. Defaults to an en dash. */
  separator?: ReactNode;
  /**
   * PROPS FOR ONE FIELD ONLY, which the shared ones above cannot be.
   *
   * Everything else here reaches BOTH inputs, and that is right for `disabled`
   * or `size`. It is wrong for anything a form binding produces: measured, a
   * bound twin spreading one end's `onChange` through the shared channel
   * attached it to both carriers, so the start's binding was told the end's
   * value and the two ends of the form held the same date.
   *
   * Applied after the shared props, so a per-field prop wins.
   */
  startFieldProps?: Partial<ComponentProps<typeof DateInput>>;
  endFieldProps?: Partial<ComponentProps<typeof DateInput>>;
  /**
   * The nodes holding the two ISO values, if you need them.
   *
   * The picker keeps its own references regardless; yours are merged in. What
   * actually asks for these is a form binding — react-hook-form reads `.value`
   * off the element its ref was given, and it has to be the carrier and not the
   * visible field, which holds `12/08/2026`.
   */
  startCarrierRef?: ComponentProps<typeof DateInput>['carrierRef'];
  endCarrierRef?: ComponentProps<typeof DateInput>['carrierRef'];
};

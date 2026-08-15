import type { ComponentProps, ReactNode } from 'react';
import type { DateRangePicker } from '../date-range-picker/date-range-picker.component.js';
import type { BindingOwned } from '../../form/binding-owned.types.js';

interface FormDateRangePickerOwnProps {
  /** The name each end posts under, as your form library knows them. */
  startName: string;
  endName: string;
  /** The accessible name of each field. */
  startLabel: string;
  endLabel: string;
  /** The visible name of the PAIR, rendered as the group's legend. */
  legend: ReactNode;
  hint?: ReactNode;
}

/**
 * A bound date range — the label, the two fields, the calendar, the hint and
 * the errors in one tag.
 *
 * IT BINDS TWO FIELDS, and it is the first component here that does. The form
 * port is `(name) => BoundField`, a hook called once per field, so two fields
 * are two calls — no new port shape, which was worth checking before this was
 * written and is recorded in ADR-0027 because an earlier draft claimed
 * otherwise.
 */
export type FormDateRangePickerProps = FormDateRangePickerOwnProps &
  Omit<
    ComponentProps<typeof DateRangePicker>,
    | keyof FormDateRangePickerOwnProps
    | keyof BindingOwned
    // Seeds are the binding's: given here they would put a date in the DOM
    // without telling the library, which then validates an empty field and
    // overwrites it on its first pass.
    | 'defaultStart'
    | 'defaultEnd'
    // The binding's refs go to the carriers, and a call site cannot redirect
    // them — a library reading `.value` off a visible field gets `12/08/2026`
    // where it wanted an ISO date.
    | 'startCarrierRef'
    | 'endCarrierRef'
    // The per-field channels carry the BINDING, one end each. Left on the
    // public type they compiled and were then eaten: this component's own
    // spread lands after the call site's, so a `startFieldProps` from outside
    // reached nothing — measured, zero elements carried it.
    | 'startFieldProps'
    | 'endFieldProps'
  >;

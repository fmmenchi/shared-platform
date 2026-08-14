import type { ComponentProps, ReactNode } from 'react';
import type { DatePicker } from '../date-picker/date-picker.component.js';
import type { BindingOwned } from '../../form/binding-owned.types.js';

interface FormDatePickerOwnProps {
  /** The field name, as your form library knows it. */
  name: string;
  /** The visible label, rendered before the field. */
  label: ReactNode;
  hint?: ReactNode;
}

/**
 * A `DatePicker` already bound to the form library in scope — the label, the
 * field, the calendar, the hint and the errors in one tag.
 *
 * It is `FormDateInput`'s shape with a calendar behind the field, and it stands
 * to `DatePicker` exactly as `FormDateInput` stands to `DateInput`.
 */
export type FormDatePickerProps = FormDatePickerOwnProps &
  Omit<
    ComponentProps<typeof DatePicker>,
    | keyof FormDatePickerOwnProps
    | keyof BindingOwned
    // A `defaultValue` under another name, and the binding owns those: it would
    // seed the DOM without telling the form library, which then validates an
    // empty field and overwrites the seed on its first pass.
    | 'defaultDate'
    // THE ONE DIFFERENCE FROM `FormDateInput`, and it is a door opening rather
    // than closing. There the binding's ref goes to the carrier and a call site
    // cannot redirect it, so a hand-composed picker cannot reach the node and
    // has to write through the library's own lever instead. Here the component
    // renders the field itself, so it holds BOTH refs and needs no lever — and
    // there is nothing left for a call site to ask for.
    | 'carrierRef'
  >;

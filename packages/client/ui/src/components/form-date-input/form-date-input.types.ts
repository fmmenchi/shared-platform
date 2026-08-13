import type { ComponentProps, ReactNode } from 'react';
import type { DateInput } from '../date-input/date-input.component.js';
import type { BindingOwned } from '../../form/binding-owned.types.js';

interface FormDateInputOwnProps {
  /** The field name, as your form library knows it. */
  name: string;
  /** The visible label, rendered before the field. */
  label: ReactNode;
  hint?: ReactNode;
}

/**
 * A `Field` + `DateInput` already bound to the form library in scope — the
 * label, the field, the hint and the errors in one tag.
 *
 * It is `FormInput`'s shape with a different control inside, because
 * `DateInput` is one text field: a `<label>` names it, and there is no
 * `Fieldset` and no legend, which belong to controls that are a group.
 *
 * `value` and `onChange` are the binding's, not the call site's — see
 * `BindingOwned`. What the binding sees is the ISO string on the carrier; what
 * the user sees is that date in the declared locale's order.
 */
export type FormDateInputProps = FormDateInputOwnProps &
  Omit<
    ComponentProps<typeof DateInput>,
    keyof FormDateInputOwnProps | keyof BindingOwned
  >;

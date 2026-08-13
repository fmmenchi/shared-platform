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
    | keyof FormDateInputOwnProps
    | keyof BindingOwned
    // `defaultDate` IS a `defaultValue` under another name, so it belongs with
    // the props the binding owns — and `BindingOwned` cannot list it, because
    // that list is shared with every other adapter and no other control has one.
    // Left accepted, it seeded the DOM without ever telling the form library:
    // the user saw `01/05/1990` and the library validated an empty field, then
    // overwrote the seed on its first pass. Seed through the binding instead.
    | 'defaultDate'
    // The binding's ref goes to the carrier; a call site cannot redirect it.
    | 'carrierRef'
  >;

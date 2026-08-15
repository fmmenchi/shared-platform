import type { ComponentProps, ReactNode } from 'react';
import type { TimeInput } from '../time-input/time-input.component.js';
import type { BindingOwned } from '../../form/binding-owned.types.js';

interface FormTimeInputOwnProps {
  /** The field name, as your form library knows it. */
  name: string;
  /** The visible label, rendered before the field. */
  label: ReactNode;
  hint?: ReactNode;
}

/**
 * A `Field` + `TimeInput` already bound to the form library in scope — the
 * label, the field, the hint and the errors in one tag.
 *
 * It is `FormDateInput`'s shape with a different control inside, because
 * `TimeInput` is one text field: a `<label>` names it, and there is no
 * `Fieldset` and no legend, which belong to controls that are a group.
 *
 * `value` and `onChange` are the binding's, not the call site's — see
 * `BindingOwned`. What the binding sees is `HH:mm` on the carrier; what the
 * user sees is that time in the declared locale's hour cycle.
 */
export type FormTimeInputProps = FormTimeInputOwnProps &
  Omit<
    ComponentProps<typeof TimeInput>,
    | keyof FormTimeInputOwnProps
    | keyof BindingOwned
    // `defaultTime` IS a `defaultValue` under another name, so it belongs with
    // the props the binding owns — the same reason `FormDateInput` refuses
    // `defaultDate`. Left accepted, it seeds the DOM without ever telling the
    // form library, which then validates an empty field and overwrites the seed
    // on its first pass.
    | 'defaultTime'
    // The binding's ref goes to the carrier; a call site cannot redirect it.
    | 'carrierRef'
  >;

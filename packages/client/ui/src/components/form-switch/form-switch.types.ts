import type { ComponentProps, ReactNode } from 'react';
import type { Switch } from '../switch/switch.component.js';
import type { BindingOwned } from '../../form/binding-owned.types.js';

interface FormSwitchOwnProps {
  /** The field name, as your form library knows it. */
  name: string;
  label: ReactNode;
  hint?: ReactNode;
}

/**
 * A `ChoiceField` + `Switch` already bound to the form library in scope — a
 * setting whose state the library holds. `checked` and `onChange` are the
 * binding's, not the call site's: see `BindingOwned`.
 *
 * For a choice that waits for a submit, that is `FormChoice` — the difference
 * is the user's question, not the shape (ADR-0024).
 */
export type FormSwitchProps = FormSwitchOwnProps &
  Omit<
    ComponentProps<typeof Switch>,
    keyof FormSwitchOwnProps | keyof BindingOwned
  >;

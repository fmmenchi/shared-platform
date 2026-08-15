import type { ComponentProps, ReactNode } from 'react';
import type { Combobox } from '../combobox/combobox.component.js';
import type { BindingOwned } from '../../form/binding-owned.types.js';

interface FormComboboxOwnProps {
  /** The field name — what the binding is looked up by and what the form submits. */
  name: string;
  /** The field's label, which `Field` renders and associates. */
  label: ReactNode;
  /** Help text under the control, before any error. */
  hint?: ReactNode;
}

/**
 * Public FormCombobox props — a `Combobox` inside a `Field`, already bound.
 *
 * What the BINDING owns never travels from the call site (`BindingOwned`): a
 * `value` or an `onChange` passed here would not override the binding, it would
 * sever it. `ref` is the exception the two can share — it stays pointed at the
 * visible field, while the binding's own goes to the carrier.
 */
export type FormComboboxProps<T> = FormComboboxOwnProps &
  Omit<
    ComponentProps<typeof Combobox<T>>,
    keyof FormComboboxOwnProps | keyof BindingOwned | 'carrierRef'
  >;

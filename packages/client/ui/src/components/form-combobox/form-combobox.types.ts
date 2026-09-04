import type { ReactNode } from 'react';
import type { ComboboxSingleOnlyProps } from '../combobox/combobox.types.js';
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
 *
 * SINGLE-SELECT ONLY, and that is the form port's limit rather than this
 * wrapper's taste: a set under one name needs the binding to hear a carrier
 * LEAVE, and three of the five measurably do not (ADR-0028 §12, and the
 * carrier-count proof in `apps/ui-ports-validation`). `multiple` is therefore
 * not in this type at all — an unbound `Combobox` takes it and reports the
 * selection through `onValueChange`.
 */
export type FormComboboxProps<T> = FormComboboxOwnProps &
  Omit<
    ComboboxSingleOnlyProps<T>,
    keyof FormComboboxOwnProps | keyof BindingOwned | 'carrierRef'
  >;

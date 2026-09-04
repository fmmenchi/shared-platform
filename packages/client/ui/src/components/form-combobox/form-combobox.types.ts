import type { ReactNode } from 'react';
import type {
  ComboboxMultipleOnlyProps,
  ComboboxSingleOnlyProps,
} from '../combobox/combobox.types.js';
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
 * TWO HALVES, and `multiple` chooses between them — the same split the
 * unbound component makes, carried through because the two bind through
 * DIFFERENT PORTS. One value is a per-field binding (`UseFormField`); a set is
 * the option binding (`UseFormOptionField`), which is the only one that can say
 * a whole list. Written as one type with an optional flag, a call site would
 * typecheck against a binding it never gets.
 *
 * They are also two components behind this one name, because a hook cannot be
 * called conditionally and `useBoundOptionField` throws where an adapter has no
 * `optionField`. The mode is structural rather than state: a control that
 * changed it mid-life would be a different control.
 */
export type FormComboboxProps<T> =
  | (FormComboboxOwnProps &
      Omit<
        ComboboxSingleOnlyProps<T>,
        keyof FormComboboxOwnProps | keyof BindingOwned | 'carrierRef'
      >)
  | (FormComboboxOwnProps &
      Omit<
        ComboboxMultipleOnlyProps<T>,
        keyof FormComboboxOwnProps | keyof BindingOwned | 'carrierRef'
      >);

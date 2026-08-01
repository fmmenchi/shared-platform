import type { ComponentProps, ReactNode } from 'react';
import type { Select } from '../select/select.component.js';
import type { BindingOwned } from '../../form/binding-owned.types.js';

interface FormSelectOwnProps {
  /** The field name, as your form library knows it. */
  name: string;
  label: ReactNode;
  hint?: ReactNode;
  /** The options: `<option>` and `<optgroup>`, as HTML writes them. */
  children?: ReactNode;
}

/**
 * A `Field` + `Select` already bound to the form library in scope. The messages
 * come from the adapter as a list, so there is no `error` prop to forget or to
 * set out of step with the library's own state — and no `value` or `onChange`
 * either, for the reason in `BindingOwned`.
 */
export type FormSelectProps = FormSelectOwnProps &
  Omit<
    ComponentProps<typeof Select>,
    keyof FormSelectOwnProps | keyof BindingOwned
  >;

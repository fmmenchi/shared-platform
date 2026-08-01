import type { ComponentProps, ReactNode } from 'react';
import type { Input } from '../input/input.component.js';
import type { BindingOwned } from '../../form/binding-owned.types.js';

interface FormInputOwnProps {
  /** The field name, as your form library knows it. */
  name: string;
  label: ReactNode;
  hint?: ReactNode;
}

/**
 * A `Field` + `Input` already bound to the form library in scope. The error
 * comes from the adapter, so there is no `error` prop to forget or to set out
 * of step with the library's own state — and no `value` or `onChange` either,
 * for the same reason: see `BindingOwned`.
 */
export type FormInputProps = FormInputOwnProps &
  Omit<
    ComponentProps<typeof Input>,
    keyof FormInputOwnProps | keyof BindingOwned
  >;

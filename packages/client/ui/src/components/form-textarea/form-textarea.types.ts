import type { ComponentProps, ReactNode } from 'react';
import type { Textarea } from '../textarea/textarea.component.js';
import type { BindingOwned } from '../../form/binding-owned.types.js';

interface FormTextareaOwnProps {
  /** The field name, as your form library knows it. */
  name: string;
  label: ReactNode;
  hint?: ReactNode;
}

/**
 * A `Field` + `Textarea` already bound to the form library in scope. The
 * messages come from the adapter as a list, so there is no `error` prop to
 * forget or to set out of step with the library's own state — and no `value` or
 * `onChange` either, for the reason in `BindingOwned`.
 */
export type FormTextareaProps = FormTextareaOwnProps &
  Omit<
    ComponentProps<typeof Textarea>,
    keyof FormTextareaOwnProps | keyof BindingOwned
  >;

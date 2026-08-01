import type { ComponentPropsWithRef, ReactNode } from 'react';
import type {
  UseFormField,
  UseFormStatus,
} from '../../form/form-adapter.types.js';

interface FormOwnProps {
  children?: ReactNode;
  /**
   * The field-binding hook for the form library you are using — written once
   * per app. Every bound control below reads it.
   */
  field: UseFormField;
  /**
   * The form-state hook, for `FormSubmit` and `FormErrorSummary`. Optional: a
   * form using neither never needs to supply it.
   */
  status?: UseFormStatus;
  /**
   * Leave the browser's own validation off, which is the default and almost
   * always right: with it ON, the browser blocks submission before your handler
   * ever runs — measured, the handler is called ZERO times — and shows its own
   * unstyleable bubbles, in its own language, competing with `FieldError`.
   *
   * Set it to `false` only for a form with no validation of its own, where the
   * native bubbles are all there is.
   */
  noValidate?: boolean;
}

/**
 * The `<form>` element, its adapter scope, and the one attribute that is easy
 * to forget and silently fatal.
 */
export type FormProps = FormOwnProps &
  Omit<ComponentPropsWithRef<'form'>, keyof FormOwnProps>;

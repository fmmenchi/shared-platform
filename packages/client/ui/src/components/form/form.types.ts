import type { ComponentPropsWithRef, ReactNode } from 'react';
import type {
  UseFormField,
  UseFormErrors,
} from '../../form/form-adapter.types.js';

interface FormOwnProps {
  children?: ReactNode;
  /**
   * The field-binding hook for the form library you are using.
   *
   * Usually OMITTED: give it once to `UiProvider` when the design system is set
   * up and every form below works with nothing further to wire. Pass it here
   * only to override that — the rare page binding two libraries at once.
   */
  field?: UseFormField;
  /** The errors hook, overriding the one given at setup. */
  errors?: UseFormErrors;
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

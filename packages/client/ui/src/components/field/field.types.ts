import type { ComponentPropsWithRef, ReactNode } from 'react';

interface FieldOwnProps {
  /** The label, control, description, and error parts. */
  children?: ReactNode;
  /**
   * Error state — sets the control's `aria-invalid` and reveals the error look.
   * The consumer's validation library owns WHEN this is true (ADR-0013).
   */
  invalid?: boolean;
}

/**
 * A `Field` groups a label, a control, and optional description/error text, and
 * wires them for accessibility (id ↔ `htmlFor`, `aria-describedby`, `aria-invalid`)
 * via context — so any transparent control inside picks the wiring up. Layout
 * only; no chrome of its own.
 */
export type FieldProps = FieldOwnProps &
  Omit<ComponentPropsWithRef<'div'>, keyof FieldOwnProps>;

/** The field's label — associates with the control via the shared id. */
export type FieldLabelProps = ComponentPropsWithRef<'label'>;

/** Helper text, registered into the control's `aria-describedby`. */
export type FieldDescriptionProps = ComponentPropsWithRef<'p'>;

/**
 * The error message, registered into `aria-describedby` and rendered only when
 * it has content. Announcement of a freshly-appearing error (focus-on-error or
 * an error summary) is the consumer's job.
 */
export type FieldErrorProps = ComponentPropsWithRef<'p'>;

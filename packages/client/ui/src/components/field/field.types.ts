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

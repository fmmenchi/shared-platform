import type { ComponentPropsWithRef, ReactNode } from 'react';

/** How a `Field` places its label relative to the control. */
export type FieldOrientation = 'vertical' | 'horizontal';

interface FieldOwnProps {
  /**
   * `vertical` (the default) puts the label ABOVE the control — the ordinary
   * text field. `horizontal` puts the control FIRST and its label beside it,
   * which is the anatomy of a single checkbox or radio; the hint and error then
   * align under the label, not under the control.
   *
   * A plain union rather than one derived from a cva definition: `VariantProps`
   * also admits `null`, which cva reads as "skip this variant" — it would
   * typecheck and silently leave the field with no layout.
   */
  orientation?: FieldOrientation;
  /** The control, plus any parts you compose by hand. */
  children?: ReactNode;
  /**
   * Error state — sets the control's `aria-invalid` and reveals the error look.
   * The consumer's validation library owns WHEN this is true (ADR-0013).
   *
   * Defaults to whether `error` has content, so the state and the message cannot
   * drift apart. Set it explicitly for a field that is invalid before it has
   * anything to say.
   */
  invalid?: boolean;
  /**
   * Shorthand for a `FieldLabel` before the control. Compose the part instead
   * when the label needs structure of its own (a badge, a counter, markup).
   */
  label?: ReactNode;
  /**
   * Shorthand for a `FieldDescription` after the control — helper text that is
   * announced with the field.
   */
  hint?: ReactNode;
  /**
   * Shorthand for a `FieldError` after the hint. Content here also turns
   * `invalid` on. Empty content renders nothing, so
   * `error={errors.email?.message}` is safe to pass unconditionally.
   */
  error?: ReactNode;
}

/**
 * A `Field` groups a label, a control, and optional description/error text, and
 * wires them for accessibility (id ↔ `htmlFor`, `aria-describedby`, `aria-invalid`)
 * via context — so any transparent control inside picks the wiring up, including
 * one the design system does not own. Layout only; no chrome of its own.
 *
 * The `label`/`hint`/`error` props are a shorthand that renders the matching
 * parts; composing those parts by hand does the same thing and stays supported.
 * Use one or the other per part — two labels for one control concatenate into
 * its accessible name, which is flagged in development.
 */
export type FieldProps = FieldOwnProps &
  Omit<ComponentPropsWithRef<'div'>, keyof FieldOwnProps>;

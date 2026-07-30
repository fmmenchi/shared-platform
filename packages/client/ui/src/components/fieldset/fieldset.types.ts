import type { ComponentPropsWithRef, ReactNode } from 'react';

interface FieldsetOwnProps {
  /** The legend, description, content, and error parts. */
  children?: ReactNode;
  /**
   * Error state of the GROUP. It exposes `data-invalid` for your own styling and
   * — only when you also set `role="radiogroup"`, the one role a `<fieldset>` may
   * take that supports it — `aria-invalid`. On a plain `<fieldset>` (`role=group`)
   * `aria-invalid` is not a supported attribute, so the error TEXT is what carries
   * the state to assistive tech. It does not change what renders on its own, and
   * it is not mirrored onto the controls inside: marking every radio `aria-invalid`
   * would repeat one problem N times. The consumer's validation library owns WHEN
   * this is true (ADR-0013).
   */
  invalid?: boolean;
}

/**
 * A `Fieldset` groups related controls in a native `<fieldset>` named by its
 * `<legend>`, and registers the group's description/error into its
 * `aria-describedby`. Native `disabled` passes straight through and disables
 * every control inside, as does `role` — set `role="radiogroup"` for a group of
 * radios. Layout only; no chrome of its own.
 */
export type FieldsetProps = FieldsetOwnProps &
  Omit<ComponentPropsWithRef<'fieldset'>, keyof FieldsetOwnProps>;

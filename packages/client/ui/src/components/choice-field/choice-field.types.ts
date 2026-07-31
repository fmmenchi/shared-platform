import type { ComponentPropsWithRef, ReactNode } from 'react';

interface ChoiceFieldOwnProps {
  /**
   * The control this field is about — a single `Checkbox` or `Radio`. It comes
   * first, on screen and in the DOM.
   */
  children?: ReactNode;
  /**
   * The label, beside the control. REQUIRED, unlike `Field`'s: a choice with no
   * words next to it is not a field, it is a stray box, and there is no version
   * of this anatomy that makes sense without one.
   */
  label: ReactNode;
  /**
   * Helper text under the label. Rarely needed here — the label of a single
   * choice usually says everything — so reach for it only when the consequence
   * of ticking the box is not obvious from the label alone.
   */
  hint?: ReactNode;
  /**
   * The error message, under the label. Content here also turns `invalid` on,
   * so the state and the message cannot drift apart. Empty content renders
   * nothing, so `error={errors.tos?.message}` is safe to pass unconditionally.
   */
  error?: ReactNode;
  /**
   * Error state — sets the control's `aria-invalid`. Defaults to whether
   * `error` has content; set it explicitly for a field that is invalid before
   * it has anything to say.
   */
  invalid?: boolean;
}

/**
 * A single choice and the words next to it: the control leads, its label sits
 * beside it, and the hint and error line up under the label.
 *
 * A separate component from `Field` rather than a prop on it, because the two
 * anatomies take different props — a label that must exist, a hint that rarely
 * does — and one component would carry props that apply to only half its uses.
 */
export type ChoiceFieldProps = ChoiceFieldOwnProps &
  Omit<ComponentPropsWithRef<'div'>, keyof ChoiceFieldOwnProps>;

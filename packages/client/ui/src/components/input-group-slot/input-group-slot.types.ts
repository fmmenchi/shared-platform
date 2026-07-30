import type { ComponentPropsWithRef, ReactNode } from 'react';

interface InputGroupSlotOwnProps {
  children?: ReactNode;
  /**
   * Whether the slot holds something the user operates — a clear or reveal button.
   *
   * Decorative by default, which is not cosmetic: a decorative slot lets pointer
   * events through, so clicking the icon focuses the field the way clicking a bare
   * input does. Set this when the slot contains a control, or the control cannot
   * be clicked. Give that control its own accessible name; the slot does not name
   * it, and a decorative icon should be `aria-hidden` (icons are app-side).
   */
  interactive?: boolean;
}

/**
 * Content inset into a field's border — an icon, a prefix, a clear button. It also
 * provides the field's horizontal inset on its side, so text never runs under it.
 */
export type InputGroupSlotProps = InputGroupSlotOwnProps &
  Omit<ComponentPropsWithRef<'span'>, keyof InputGroupSlotOwnProps>;

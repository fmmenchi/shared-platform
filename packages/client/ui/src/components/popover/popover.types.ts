import type { ReactNode } from 'react';
import type { Placement } from '@floating-ui/dom';

export interface PopoverProps {
  /** The trigger, the content, and whatever else belongs to this popover. */
  children: ReactNode;
  /**
   * Preferred side of the trigger, and where it sits along that side. The bare
   * side is centred; `-start`/`-end` align it, logically — under `dir="rtl"`,
   * `bottom-start` is on the right. Flipped when there is no room, slid back in
   * when it would leave the viewport.
   */
  placement?: Placement;
  /**
   * Opens and closes it from your own state.
   *
   * While you pass it, the trigger asks you instead of toggling the popover
   * itself — so pass `onOpenChange` as well, or nothing will ever set this to
   * `true`. The platform can still dismiss the popover on its own (a click
   * outside, `Escape`, another popover opening) and it will, even while this
   * says `true`; `onOpenChange` is how you hear about it.
   *
   * Leave it out to let the DOM own the state.
   */
  open?: boolean;
  /**
   * Show it on the first render, then stay out of the way. Ignored while you
   * pass `open`.
   */
  defaultOpen?: boolean;
  /**
   * Called whenever it opens or closes — from the trigger, from the platform
   * (a click outside, `Escape`, another popover opening), or from `open`
   * itself. Required in practice whenever you pass `open`, and warned about in
   * development if it is missing.
   */
  onOpenChange?: (open: boolean) => void;
}

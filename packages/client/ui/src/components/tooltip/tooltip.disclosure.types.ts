/** How long the tooltip waits before it appears and before it goes. */
export interface TooltipTiming {
  /** Pointer rest before it opens, in ms. Focus never waits. */
  openDelay: number;
  /** How long it survives after the pointer leaves — WCAG 1.4.13 "hoverable". */
  closeDelay: number;
}

/**
 * What can happen to a tooltip, named. Every member is one thing a user did,
 * not one thing the component does — which is why there is no `setOpen` here:
 * the timing and the click/focus race are the state's business, not the
 * listeners'.
 */
export interface TooltipDisclosure {
  /** Shown right now. */
  open: boolean;
  /** Shown, or asked for and still waiting — the window in which `Escape` has something to dismiss. */
  engaged: boolean;
  /** The pointer is on the surface: keep it, with no delay. */
  showNow: () => void;
  /** The pointer arrived on the trigger. */
  showAfterDelay: () => void;
  /** The keyboard arrived — ignored when a press put the focus there. */
  showOnFocus: () => void;
  /** The pointer left the trigger or the surface. */
  hideAfterDelay: () => void;
  /** `Escape`: it goes now, and an open that was only asked for never happens. */
  dismiss: () => void;
  /** A press: it goes now, and the focus that follows must not bring it back. */
  dismissOnPress: () => void;
  /** That press is over — the next focus is a reason to open again. */
  releasePress: () => void;
}

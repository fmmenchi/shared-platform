import type { ReactNode } from 'react';

export interface DialogProps {
  /** The trigger, the dialog itself, and whatever else belongs to it. */
  children: ReactNode;
  /**
   * Opens and closes it from your own state.
   *
   * While you pass it, the trigger asks you instead of opening the dialog
   * itself — so pass `onOpenChange` as well, or nothing will ever set this to
   * `true`. The browser can still close the dialog on its own (`Escape`, a
   * click on the backdrop, a `method="dialog"` form) and it will, even while
   * this says `true`; `onOpenChange` is how you hear about it.
   *
   * Leave it out to let the DOM own the state.
   */
  open?: boolean;
  /**
   * Open it on the first render, then stay out of the way. Ignored while you
   * pass `open`.
   */
  defaultOpen?: boolean;
  /**
   * Called whenever it opens or closes — from the trigger, from the browser
   * (`Escape`, the backdrop, `method="dialog"`), or from `open` itself.
   * Required in practice whenever you pass `open`, and warned about in
   * development if it is missing.
   */
  onOpenChange?: (open: boolean) => void;
}

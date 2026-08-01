import type { ReactNode } from 'react';

export interface DialogProps {
  /** The trigger, the dialog itself, and whatever else belongs to it. */
  children: ReactNode;
  /**
   * Told when the platform opens or closes it. A REPORT, not a control: the
   * state lives in the DOM, where the browser put it. To drive one from code,
   * call `showModal()` / `close()` on the content's ref — the platform's own
   * API, and the same pair the parts use when a browser has no invoker
   * commands yet.
   */
  onOpenChange?: (open: boolean) => void;
}

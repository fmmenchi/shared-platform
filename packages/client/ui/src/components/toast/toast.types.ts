import type { ReactNode } from 'react';
import type { AlertVariants } from '../alert/alert.types.js';

/** What a caller asks for when it raises one. */
export interface ToastOptions {
  /** The status, which carries meaning through colour AND a hidden word. */
  variant?: AlertVariants['variant'];
  /** A short heading. */
  title?: ReactNode;
  /** The message. */
  children?: ReactNode;
  /**
   * How long it stays, in ms. `0` keeps it until dismissed.
   *
   * A message that removes itself on a timer is a TIME LIMIT (WCAG 2.2.1), so
   * the clock stops while a pointer is over the region or the focus is inside
   * it — otherwise a reader who has just arrived watches the thing they came
   * for disappear. An error defaults to staying: something went wrong is not a
   * thing to skim.
   */
  duration?: number;
}

/** One raised toast, as the region holds it. */
export interface ToastEntry extends ToastOptions {
  id: string;
}

export interface ToastProps extends ToastEntry {
  /** Called when this one asks to go. */
  onDismiss: (id: string) => void;
  /** Paused while the pointer or the focus is in the region. */
  paused: boolean;
}

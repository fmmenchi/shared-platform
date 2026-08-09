import type { ComponentPropsWithRef, ReactNode } from 'react';
import type { ToastEntry, ToastOptions } from '../toast/toast.types.js';

/** Where the stack sits on the screen. */
export type ToastPlacement =
  'block-start' | 'block-end' | 'inline-start' | 'inline-end';

export interface ToastRegionProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children'
> {
  /** Default `block-end` — the corner a phone's thumb does not cover. */
  placement?: ToastPlacement;
  /**
   * How many are kept. The oldest goes when the next one arrives.
   *
   * Default 5. Unbounded was the first version, and errors default to staying:
   * a five-second poll failing over a dead network built a column that ran off
   * the top of the viewport, where the older messages could be neither read,
   * reached nor dismissed.
   */
  max?: number;
  /**
   * What the region is called. A live region with no name is announced as
   * nothing in particular, and a page may have other live content.
   */
  'aria-label'?: string;
  /** The app. The region renders after it. */
  children: ReactNode;
}

export interface ToastContextValue {
  /** Raise one. Returns its id, so a caller can take it back. */
  toast: (options: ToastOptions) => string;
  /** Take one back before its time, or all of them with no argument. */
  dismiss: (id?: string) => void;
  /** What is up, in the order it was raised. */
  toasts: readonly ToastEntry[];
}

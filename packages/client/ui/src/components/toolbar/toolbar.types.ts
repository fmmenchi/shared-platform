import type { ComponentPropsWithRef, ReactNode } from 'react';

/** Which way the bar runs, and therefore which pair of arrows walks it. */
export type ToolbarOrientation = 'horizontal' | 'vertical';

export interface ToolbarProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children'
> {
  /**
   * What this set of controls is for — "Text formatting", "Playback".
   *
   * Required, and not a nicety: a screen reader announces "toolbar", and a page
   * with two of them offers its user two entries by the same name. It is the
   * one thing only you can supply.
   */
  label: string;
  /**
   * `'horizontal'` (default) — the controls sit side by side and the inline
   * arrows walk them, which in a right-to-left page means ArrowLeft moves
   * forward.
   *
   * `'vertical'` — they sit above one another and Up/Down walk them. Only this
   * one is announced, because horizontal is what `role="toolbar"` already means.
   */
  orientation?: ToolbarOrientation;
  /** The controls, each wrapped in a `ToolbarItem`. */
  children: ReactNode;
}

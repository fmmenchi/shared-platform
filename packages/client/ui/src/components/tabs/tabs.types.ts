import type { ComponentPropsWithRef, ReactNode } from 'react';

/** Which way the tab list runs, and therefore which arrows walk it. */
export type TabsOrientation = 'horizontal' | 'vertical';

/**
 * Whether moving the focus also selects.
 *
 * `automatic` is the APG's recommendation and the better experience: a reader
 * arrowing along the list hears each panel as they reach it, with no second
 * keystroke. `manual` is for panels that cost something to show — a fetch, a
 * chart — where selecting six of them on the way to the seventh is the wrong
 * thing to do to someone driving with the keyboard.
 */
export type TabsActivation = 'automatic' | 'manual';

export interface TabsProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'defaultValue' | 'onChange'
> {
  /** The selected tab's `value`, when you hold the state. */
  value?: string;
  /** The tab selected at first, when the component holds the state. */
  defaultValue?: string;
  /** Called with the new value on every change, controlled or not. */
  onValueChange?: (value: string) => void;
  /** Default `horizontal`. Also sets `aria-orientation` on the list. */
  orientation?: TabsOrientation;
  /** Default `automatic` — see `TabsActivation`. */
  activation?: TabsActivation;
  /** A `TabList` and the `TabPanel`s. */
  children: ReactNode;
}

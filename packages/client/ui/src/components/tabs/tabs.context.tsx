import { createPartContext } from '../../primitives/part-context.js';
import type { Descendants } from '../../primitives/use-descendants.types.js';
import type { TabsActivation, TabsOrientation } from './tabs.types.js';

/** What a `Tab` tells its family about itself. */
export interface TabData {
  value: string;
  disabled: boolean;
}

export interface TabsContextValue {
  /**
   * The tab that is SHOWING — the caller's value when it names a real tab, and
   * the first usable one when it does not. Never a value no tab answers to, so
   * a list can never be left with nothing at `tabindex="0"`.
   */
  value: string | undefined;
  /** Select a tab. Refuses a disabled one. */
  select: (value: string) => void;
  /**
   * The tab that currently carries `tabindex="0"` — the FOCUSED one, which is
   * not the selected one under manual activation. Arrowing from tab 1 to tab 3
   * without activating and then tabbing away and back must return to tab 3;
   * tracking selection instead silently discards the two arrow presses, in the
   * one mode where re-arrowing costs the most.
   */
  tabStop: string | undefined;
  /** Called by a `Tab` when it takes the focus. */
  setTabStop: (value: string) => void;
  /** Whether any `Tab` answers to this value — for `TabPanel`'s own warning. */
  hasTab: (value: string) => boolean;
  orientation: TabsOrientation;
  activation: TabsActivation;
  /** The stem both ids are derived from. */
  baseId: string;
  /** The tabs, in tree order, for the keyboard to walk. */
  tabs: Descendants<TabData>;
}

const { Context, useFamilyContext, usePart } =
  createPartContext<TabsContextValue>('Tabs');

export const TabsContext = Context;
export const useTabsContext = useFamilyContext;
export const useTabsPart = usePart;

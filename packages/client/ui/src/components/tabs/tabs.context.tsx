import { createPartContext } from '../../primitives/part-context.js';
import type { Descendants } from '../../primitives/use-descendants.types.js';
import type { TabsActivation, TabsOrientation } from './tabs.types.js';

/** What a `Tab` tells its family about itself. */
export interface TabData {
  value: string;
  disabled: boolean;
}

export interface TabsContextValue {
  /** The selected tab's value, or `undefined` before anything is selected. */
  value: string | undefined;
  /** Select a tab. Ignored for a disabled one — the caller checks. */
  select: (value: string) => void;
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

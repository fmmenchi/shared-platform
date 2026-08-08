import { createPartContext } from '../../primitives/part-context.js';
import type { Descendants } from '../../primitives/use-descendants.types.js';

export interface ToolbarContextValue {
  /**
   * The controls, in tree order, for the arrows to walk.
   *
   * And that is the WHOLE context — there is no `tabStop` here, which is the
   * one thing worth reading this file for. A tab list keeps its tab stop in
   * React state and each `Tab` renders `tabindex` from it, because `Tabs` owns
   * every part and can name them. This bar keeps it on the ELEMENTS instead,
   * which is what this package's own rule asks for when a fact has to travel
   * between parts before React can re-render — see `toolbar.component.tsx`.
   *
   * What that buys, beyond the rule: `ToolbarItem` renders nothing conditional,
   * so it needs no identity, no `useId`, and no re-render when the focus moves.
   */
  items: Descendants<undefined>;
}

const { Context, useFamilyContext, usePart } =
  createPartContext<ToolbarContextValue>('Toolbar');

export const ToolbarContext = Context;
export const useToolbarContext = useFamilyContext;
export const useToolbarPart = usePart;

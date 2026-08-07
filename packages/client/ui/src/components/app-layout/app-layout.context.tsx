import { createPartContext } from '../../primitives/part-context.js';

/** What the shell tells its regions. */
export interface AppLayoutContextValue {
  /**
   * The id the skip link points at — owned here so the two cannot disagree.
   * A consumer who has to remember to put `id="main"` on their own `<main>` is
   * a consumer whose skip link silently goes nowhere.
   */
  mainId: string;
}

const { Context, useFamilyContext, usePart } =
  createPartContext<AppLayoutContextValue>('AppLayout');

export const AppLayoutContext = Context;
export const useAppLayoutContext = useFamilyContext;
export const useAppLayoutPart = usePart;

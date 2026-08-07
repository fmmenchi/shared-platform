import { createPartContext } from '../../primitives/part-context.js';

/** Which form the navigation region is currently in. */
export type AppLayoutNavForm = 'column' | 'drawer';

export interface AppLayoutNavContextValue {
  form: AppLayoutNavForm;
}

const { Context, useFamilyContext } =
  createPartContext<AppLayoutNavContextValue>('AppLayoutNav');

export const AppLayoutNavContext = Context;

/**
 * WHICH FORM THE NAVIGATION IS IN, for a consumer whose two forms are not the
 * same thing.
 *
 * The shell swaps the CONTAINER; what goes inside it is the product's. And the
 * two are rarely identical: a rail collapses to icons and a drawer does not, a
 * drawer carries a brand the header already shows on desktop, and on a phone it
 * usually absorbs the account and search links that live in the header on a
 * wide screen. Even the reference implementation this was modelled on passes
 * `collapsible={false}` to its own drawer.
 *
 * So the shell does not decide they are the same. It says which one is up and
 * gets out of the way. `null` outside a region — read tolerantly, like every
 * other family hook here.
 *
 * The same fact is on the element as `data-form`, for the many cases where the
 * difference is only styling and no JavaScript is needed at all.
 */
export const useAppLayoutNavForm = (): AppLayoutNavForm | null =>
  useFamilyContext()?.form ?? null;

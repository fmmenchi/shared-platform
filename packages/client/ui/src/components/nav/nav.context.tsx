import { createPartContext } from '../../primitives/part-context.js';

/** How the navigation is laid out, and what that changes beyond the CSS. */
export type NavOrientation = 'horizontal' | 'vertical';

/**
 * What a `Nav` provides to its parts.
 *
 * There is no `role="menu"` anywhere in this family, and that is the whole
 * point: a set of links is not a set of commands. The W3C's own navigation
 * tutorial marks this up as `<nav>` + lists + links with `aria-expanded` on a
 * button, and Radix says the same about the component it ships for it — "it
 * does not use the WAI-ARIA menu role". The consequence a consumer feels is the
 * one that matters: **Tab walks the links**, and in a `Menubar` it leaves.
 */
export interface NavContextValue {
  orientation: NavOrientation;
  /**
   * The groups that are open, and the ONE place that is recorded.
   *
   * Horizontal keeps at most one: a flyout that stays open while another opens
   * leaves two panels over the page. Vertical keeps as many as the user opened,
   * because an indented sidebar that shuts one section to open another loses
   * the place the user was keeping.
   */
  open: readonly string[];
  toggle: (id: string) => void;
  close: (id: string) => void;
}

const { Context, useFamilyContext, usePart } =
  createPartContext<NavContextValue>('Nav');

export const NavContext = Context;
export const useNavContext = useFamilyContext;
export const useNavPart = usePart;

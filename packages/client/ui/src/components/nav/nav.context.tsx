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
 *
 * ONE FIELD, and it used to be four. A record of which groups were open lived
 * here so that the bar could keep at most one — until the flyout became a
 * popover, and the platform started keeping that rule itself: opening one auto
 * popover closes every other that is not its ancestor, measured. The record was
 * a second copy of something the platform already knew, and everything built on
 * it (the toggle, the per-id close, the focus-out sweep) was scaffolding for
 * the copy rather than for the user.
 */
export interface NavContextValue {
  /**
   * Which FORM the groups take, which is a real difference and not a skin: a
   * bar's group is a surface OVER the page, so it is a popover — the platform
   * dismisses it on a click outside, on `Escape` from anywhere, and when
   * another opens. A sidebar's group is part of the page, opening in place and
   * indented, so it is a plain disclosure and nothing about it is transient.
   */
  orientation: NavOrientation;
}

const { Context, useFamilyContext, usePart } =
  createPartContext<NavContextValue>('Nav');

export const NavContext = Context;
export const useNavContext = useFamilyContext;
export const useNavPart = usePart;

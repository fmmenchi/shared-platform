import { createPartContext } from '../../primitives/part-context.js';
import type { MenuFamily } from '../menu/menu.context.js';

/**
 * What a `Menubar` provides: a `MenuFamily`, and nothing of its own.
 *
 * A bar is a set of commands with one tab stop — which is what a menu is —
 * minus the surface. So it hands its parts exactly the family interface a menu
 * hands its own, and `MenuItemTrigger` cannot tell the difference. That is the
 * point: an item of a bar and a command that opens a submenu are the same
 * thing, and were the same component before this existed.
 */
const { Context, useFamilyContext, usePart } =
  createPartContext<MenuFamily>('Menubar');

export const MenubarContext = Context;
export const useMenubarContext = useFamilyContext;
export const useMenubarPart = usePart;

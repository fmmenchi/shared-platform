import type { Dispatch, SetStateAction } from 'react';
import type { Placement } from '@floating-ui/dom';
import { createPartContext } from '../../primitives/part-context.js';
import type { Descendants } from '../../primitives/use-descendants.types.js';

/** What an item tells its menu about itself. */
export interface MenuItemData {
  /** The item's own id — what says which one is currently tabbable. */
  id: string;
  /** What typeahead matches, when the item's own text is not what to match. */
  textValue?: string;
  /**
   * The way OUT of a submenu, rather than something to do in it.
   *
   * It is a command like any other — the arrows reach it, typing reaches it,
   * it takes the focus — with one exception: a menu does not OPEN on it. The
   * user has just come in; the first thing they should be offered is the first
   * thing they came for.
   */
  back?: boolean;
}

/** Which way a `Menubar` runs. */
export type MenubarOrientation = 'horizontal' | 'vertical';

/**
 * WHAT A COMMAND BELONGS TO: a menu, or a menubar.
 *
 * The two are the same thing to the parts that walk them — a set of commands
 * in tree order, one of which is tabbable — and different in only one respect,
 * which is the field that says so. A `MenuItemTrigger` on a bar and one that
 * opens a submenu were never two components, and this is why.
 */
export interface MenuFamily {
  /** The commands, in tree order — the roving focus reads its neighbours here. */
  items: Descendants<MenuItemData>;
  /**
   * The ONE command that is tabbable. A menu and a menubar are each a single
   * tab stop (APG): every other command is `tabindex="-1"` and reachable only
   * with the arrows.
   *
   * An id and not the element: a command comparing its own node would be
   * reading a ref during render, which the React Compiler forbids and is right
   * to.
   */
  activeId: string | null;
  /**
   * A SETTER, updater and all: a command leaving has to say "clear this only if
   * it is still me", which it cannot ask without reading a value it would then
   * be acting on one render late.
   */
  setActiveId: Dispatch<SetStateAction<string | null>>;
  /**
   * The BAR this family is, or `null` when it is a menu.
   *
   * One question, asked in four places, and every one of them used to be asked
   * as "do I have a parent" — which a menubar makes wrong: a menu hanging off
   * a bar has a family above it but is not INSIDE anything. It is a top-level
   * surface, so it opens below its command rather than beside it, it owes no
   * way back, and the platform returns its focus without help.
   */
  bar: MenubarOrientation | null;
}

/**
 * What a `Menu` provides to its parts.
 *
 * The surface is the platform's, like the Popover's: `popovertarget` opens it,
 * `popover="auto"` dismisses it. Everything else in here exists because the
 * platform offers NOTHING for the keyboard contract a menu owes — measured in
 * all three engines: focus does not enter, the arrows do nothing, Tab walks
 * INTO the items (which a menu must not allow), and there is no typeahead.
 */
export interface MenuContextValue extends MenuFamily {
  /** A menu is never a bar; the field exists so that a PARENT can be asked. */
  bar: null;
  /** The surface's id: what the trigger targets. */
  surfaceId: string;
  /** Whether the platform has it open. Mirrored from `toggle`, never commanded. */
  open: boolean;
  reportOpen: (open: boolean) => void;
  /** The trigger's node, which the surface anchors to. */
  anchor: HTMLElement | null;
  setAnchor: (node: HTMLElement | null) => void;
  placement: Placement;
  /**
   * Close THIS surface. What "back" does in a submenu, and what `Tab` does
   * anywhere: one level, like the platform's own `Escape`.
   */
  close: () => void;
  /**
   * Close the whole stack — what a command does after it has run, because
   * leaving the menu it was chosen from standing would show the user a list of
   * things they have already done. One call: hiding the root hides everything
   * nested inside it, measured in all three engines.
   *
   * On a `MenuContextValue` and not on the family, because it is an answer only
   * a SURFACE has: a bar closes nothing, it is not one.
   */
  closeAll: () => void;
  /**
   * The family this menu hangs off — an enclosing menu, or a menubar — or
   * `null` at the root.
   *
   * A submenu is a `Menu` inside a `MenuContent`, so its provider SHADOWS the
   * outer one — and its trigger needs both: the outer family to register in, so
   * the parent's arrows reach it, and this one to open. Without a way back up,
   * the trigger could only see the menu it opens.
   */
  parent: MenuFamily | null;
  /**
   * INSIDE another surface, which is not the same as having a family above it.
   *
   * A submenu is nested; a menu hanging off a menubar is not, because a bar is
   * no surface. Everything that follows from being nested follows from this and
   * not from `parent`: the way back, the focus the platform declines to return
   * for a popover inside a popover, and closing the whole stack in one call
   * rather than one level.
   */
  nested: boolean;
}

const { Context, useFamilyContext, usePart } =
  createPartContext<MenuContextValue>('Menu');

export const MenuContext = Context;
export const useMenuContext = useFamilyContext;

/**
 * Context for a `Menu` PART, warning (with the part's own name) when it is used
 * outside one. It returns `null` rather than throwing: a misplaced part is worth
 * a loud warning, not a crashed page.
 */
export const useMenuPart = usePart;

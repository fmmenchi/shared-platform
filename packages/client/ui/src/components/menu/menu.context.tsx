import type { Placement } from '@floating-ui/dom';
import { createPartContext } from '../../primitives/part-context.js';
import type { Descendants } from '../../primitives/use-descendants.types.js';

/** What an item tells its menu about itself. */
export interface MenuItemData {
  /** The item's own id — what says which one is currently tabbable. */
  id: string;
  /** Skipped by every keyboard move, and by typeahead. */
  disabled: boolean;
  /** What typeahead matches, when the item's own text is not what to match. */
  textValue?: string;
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
export interface MenuContextValue {
  /** The surface's id: what the trigger targets. */
  surfaceId: string;
  /** Whether the platform has it open. Mirrored from `toggle`, never commanded. */
  open: boolean;
  reportOpen: (open: boolean) => void;
  /** The trigger's node, which the surface anchors to. */
  anchor: HTMLElement | null;
  setAnchor: (node: HTMLElement | null) => void;
  placement: Placement;
  /** The items, in tree order — the roving focus reads its neighbours here. */
  items: Descendants<MenuItemData>;
  /**
   * The ONE item that is tabbable. A menu is a single tab stop (APG): every
   * other item is `tabindex="-1"` and reachable only with the arrows.
   *
   * An id and not the element: an item comparing its own node would be reading
   * a ref during render, which the React Compiler forbids and is right to.
   */
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  /** Close it — what an item does after it has run. */
  close: () => void;
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

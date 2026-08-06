import { useCallback, useId, useMemo, useState } from 'react';
import { useDescendants } from '../../primitives/use-descendants.js';
import { useDirection } from '../../i18n/provider.js';
import { inlineEnd } from './menu.keyboard.js';
import { MenuContext, useMenuContext } from './menu.context.js';
import type { MenuContextValue, MenuItemData } from './menu.context.js';
import type { MenuProps } from './menu.types.js';

/**
 * A list of commands, opened from a control.
 *
 *     <Menu>
 *       <MenuTrigger>Actions</MenuTrigger>
 *       <MenuContent>
 *         <MenuItem onClick={rename}>Rename</MenuItem>
 *         <MenuItem onClick={remove}>Delete</MenuItem>
 *       </MenuContent>
 *     </Menu>
 *
 * It renders NO element of its own — it is the wiring between the parts.
 *
 * The surface is the platform's, and nothing else is. Measured in Chromium,
 * Firefox and WebKit before a line of this: `popovertarget` opens it and
 * `popover="auto"` dismisses it, but focus does not enter, the arrows do
 * nothing, `Tab` walks INTO the items — which a menu must not allow, it is one
 * tab stop — and there is no typeahead. `<menuitem>` was removed from the
 * platform years ago and reports as `HTMLUnknownElement`.
 *
 * A menu is NOT a `Select` (that is a value, and the browser draws it), and not
 * a navigation (those are links, and the browser's own Tab order is right for
 * them). It is a list of things to DO.
 */
function Menu(props: MenuProps) {
  const { children, placement, onOpenChange } = props;

  // A `Menu` inside another one IS a submenu — there is nothing else to
  // declare. Read before this component provides its own, so it is the OUTER
  // family: the provider below shadows it for everything underneath.
  const parent = useMenuContext();
  const direction = useDirection();

  const surfaceId = useId();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const items = useDescendants<MenuItemData>();

  const reportOpen = useCallback(
    (next: boolean) => {
      setOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange],
  );

  const close = useCallback(() => {
    // Through the platform, so that `toggle` reports it like any other close.
    document.getElementById(surfaceId)?.hidePopover();
  }, [surfaceId]);

  // Closing the root closes everything nested in it — measured in Chromium,
  // Gecko and WebKit — so the whole stack goes in ONE call and nothing here
  // keeps a list of what is open.
  const closeAll = parent?.closeAll ?? close;

  // A submenu sits BESIDE the command that opens it, and which side that is
  // depends on the reader's language, not on the screen: the inline direction
  // comes from the locale the design system already requires.
  const resolved =
    placement ?? (parent ? inlineEnd(direction).placement : 'bottom-start');

  const value = useMemo<MenuContextValue>(
    () => ({
      surfaceId,
      open,
      reportOpen,
      anchor,
      setAnchor,
      placement: resolved,
      items,
      activeId,
      setActiveId,
      close,
      closeAll,
      parent,
    }),
    [
      surfaceId,
      open,
      reportOpen,
      anchor,
      resolved,
      items,
      activeId,
      close,
      closeAll,
      parent,
    ],
  );

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
}

export { Menu };

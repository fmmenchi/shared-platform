import {
  useCallback,
  useMemo,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from 'react';
import { cn } from '../../util/cn.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { useDescendants } from '../../primitives/use-descendants.js';
import { useDirection } from '../../i18n/provider.js';
import { first, inlineEnd, last, step } from '../menu/menu.keyboard.js';
import { useTypeahead } from '../menu/use-typeahead.js';
import { MenubarContext } from './menubar.context.js';
import type { MenuFamily, MenuItemData } from '../menu/menu.context.js';
import type { MenubarProps } from './menubar.types.js';
import styles from './menubar.module.css';

/** The surface a command on the bar opens, or `null` if it opens none. */
function surfaceOf(element: HTMLElement | null | undefined) {
  const id = element?.getAttribute('popovertarget');
  return id ? document.getElementById(id) : null;
}

/**
 * A permanently visible bar of menus — the application menu of a desktop app.
 *
 *     <Menubar label="Editor">
 *       <Menu>
 *         <MenuItemTrigger>File</MenuItemTrigger>
 *         <MenuContent>
 *           <MenuItem onClick={save}>Save</MenuItem>
 *         </MenuContent>
 *       </Menu>
 *     </Menubar>
 *
 * It is a `Menu`'s family without a menu's surface, and it adds exactly one
 * part: this. Each menu on it is a `Menu` whose trigger is a
 * `MenuItemTrigger` — the same component that opens a submenu, unchanged,
 * because a command that belongs to one set of commands and opens another is
 * the same thing in both places.
 *
 * NOT A NAVIGATION. A `Menubar` is a list of things to DO, one tab stop, walked
 * with the arrows, and `Tab` leaves it. A bar of LINKS is a `Nav`: the browser's
 * own tab order is right for those, and taking it over is what the `menu` roles
 * would commit us to. If the reader is going somewhere rather than doing
 * something, this is the wrong component.
 *
 * ONE TAB STOP, which the platform has no notion of: every command is
 * `tabindex="-1"` except the one last used, so returning to the bar returns to
 * where the user was. Until any has been used there is nothing for `Tab` to
 * land on, so the bar itself takes that first landing and hands it straight on
 * to the first command.
 */
function Menubar(props: MenubarProps) {
  const {
    label,
    orientation = 'horizontal',
    className,
    children,
    onKeyDown,
    onFocus,
    ref,
    ...rest
  } = props;

  const direction = useDirection();
  const items = useDescendants<MenuItemData>();
  const [activeId, setActiveId] = useState<string | null>(null);
  // The same typing rules as a menu's, from the same place — the APG asks for
  // typeahead on both, and none of what makes it correct is obvious enough to
  // survive being written twice.
  const typeahead = useTypeahead();

  const value = useMemo<MenuFamily>(
    () => ({ items, activeId, setActiveId, bar: orientation }),
    [items, activeId, orientation],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event);
      // A key an open menu has already answered is not the bar's — its own
      // arrows, its typing, the `Escape` that closes it. What DOES reach here
      // from inside an open menu is the pair of keys along the bar, which that
      // menu deliberately leaves alone.
      if (event.defaultPrevented) return;

      const all = items.items();
      // From the ACTIVE command, not from whatever has the focus: with a menu
      // open the focus is inside it, and the bar still has to know which of its
      // commands the user is standing on.
      const from = all.findIndex((candidate) => candidate.data.id === activeId);

      // Hoisted out of the `switch`, and not for taste: a `case` whose value is
      // a conditional expression makes the React Compiler give up on the WHOLE
      // component, which cost `MenuContent` its compilation once already.
      const forward =
        orientation === 'horizontal'
          ? inlineEnd(direction).forward
          : 'ArrowDown';
      const backward =
        orientation === 'horizontal' ? inlineEnd(direction).back : 'ArrowUp';

      const go = (target: HTMLElement | null) => {
        if (!target) return;
        event.preventDefault();

        // WITH THE MENU, when one is open: the APG asks that walking the bar
        // carries the open menu along it, rather than leaving the user to
        // close one and open the next.
        const carry =
          surfaceOf(all[from]?.element)?.matches(':popover-open') ?? false;
        target.focus();
        if (!carry) return;

        // The one left behind goes without being told — opening an auto popover
        // closes every other that is not its ancestor, measured — and the focus
        // has already moved off it, so the platform has nobody to hand it back
        // to. Then the menu that opens takes the focus to its first command,
        // the way it does whenever it opens.
        const surface = surfaceOf(target);
        if (surface && !surface.matches(':popover-open')) surface.showPopover();
      };

      switch (event.key) {
        case forward:
          go(step(all, from, 1));
          break;
        case backward:
          go(step(all, from, -1));
          break;
        case 'Home':
          go(first(all));
          break;
        case 'End':
          go(last(all));
          break;
        default: {
          // Only while the focus is ON the bar. Inside an open menu the typing
          // is that menu's, and the one key it hands back — a Space that
          // matched nothing — is the focused command's own.
          if (!all.some((c) => c.element === document.activeElement)) break;
          const match = typeahead.search(event, all, from);
          if (match === undefined) break;
          event.preventDefault();
          match?.focus();
          break;
        }
      }
    },
    [onKeyDown, items, activeId, orientation, direction, typeahead],
  );

  const handleFocus = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      onFocus?.(event);
      // The bar itself, only until a command has been used. Handed straight on
      // rather than kept: a menubar is not somewhere to stand.
      if (event.target !== event.currentTarget) return;
      first(items.items())?.focus();
    },
    [onFocus, items],
  );

  return (
    <MenubarContext.Provider value={value}>
      <div
        // Before the spread: a page may hold more than one bar, and a name is
        // the one thing only the consumer can supply.
        aria-label={label}
        {...rest}
        ref={mergeRefs(items.rootRef, ref)}
        role="menubar"
        // Horizontal is what `role="menubar"` already means, so saying it again
        // is noise; vertical is the one that has to be said.
        aria-orientation={orientation === 'vertical' ? 'vertical' : undefined}
        data-orientation={orientation}
        tabIndex={activeId === null ? 0 : -1}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        className={cn(styles.menubar, className)}
      >
        {children}
      </div>
    </MenubarContext.Provider>
  );
}

export { Menubar };

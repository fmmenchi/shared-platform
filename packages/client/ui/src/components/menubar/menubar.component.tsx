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
import { surfaceOf } from '../menu/surface-of.js';
import { useTypeahead } from '../menu/use-typeahead.js';
import { MenubarContext } from './menubar.context.js';
import type { MenuFamily, MenuItemData } from '../menu/menu.context.js';
import type { MenubarProps } from './menubar.types.js';
import styles from './menubar.module.css';

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
 * where the user was. The APG puts that `0` on the FIRST command until one has
 * been used — not on the bar — so the bar seeds it as its commands arrive, and
 * a screen reader hears "File, menu" for the first Tab rather than "menu bar"
 * and then "File, menu".
 *
 * The bar stays focusable all the same, and only for the case that leaves: no
 * command to put it on. A bar whose commands are gated by a permission, still
 * loading, or hidden at a breakpoint has none, and so does one whose last-used
 * command has just unmounted — where nothing would carry the `0` and the whole
 * bar would drop out of the tab order.
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

      // AIMED AT COMMANDS, ours or an open menu's. `matches` and not
      // `closest`: a field a consumer has put inside one of these menus is not
      // a command, and the arrows in it belong to the caret — measured, its
      // text could not be walked, because the menu hands the bar these keys on
      // purpose and the bar was taking them from anybody.
      const target = event.target as Element;
      // ALL FOUR row roles: attribute selectors match exactly, and
      // `menuitemcheckbox`/`menuitemradio` are not `menuitem` — so from a
      // checkable row (a "Show sidebar" in a View menu, the canonical menubar
      // content) ArrowRight bubbled up and the guard refused it: the bar did
      // not walk, while the mdx promised "walking on from there still works".
      if (
        !target.matches(
          '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [role="menu"], [role="menubar"]',
        )
      ) {
        return;
      }

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

      const go = (next: HTMLElement | null) => {
        if (!next) return;
        event.preventDefault();

        // WITH THE MENU, when one is open: the APG asks that walking the bar
        // carries the open menu along it, rather than leaving the reader to
        // close one and open the next. Of its two sanctioned endings this
        // takes the second — the focus goes INTO the menu that opens, rather
        // than staying on the bar — because the menu opening is the one that
        // takes the focus, and a menu that opens without one cannot be used
        // from the keyboard at all. Walking on from there still works: the
        // key reaches the bar from inside the open menu.
        const leaving = surfaceOf(all[from]?.element);
        const carry = leaving?.matches(':popover-open') ?? false;
        next.focus();
        if (!carry) return;

        // The one left behind goes without being told — opening an auto popover
        // closes every other that is not its ancestor, measured — and the focus
        // has already moved off it, so the platform has nobody to hand it back
        // to. A command that opens NOTHING has to be told, or the menu the
        // reader has walked away from stays over the page.
        const surface = surfaceOf(next);
        if (surface) {
          if (!surface.matches(':popover-open')) surface.showPopover();
        } else {
          leaving?.hidePopover();
        }
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
          // Typing inside an open menu is that menu's, and it says so by
          // preventing the key — which the guard at the top of this handler
          // has already answered. The one key it hands back, a Space that
          // matched nothing, this search declines too, so it reaches the
          // focused command as its own. An earlier version asked again here
          // whether the focus was on the bar; no mutation of it could be made
          // to fail, because there was nothing left for it to prevent.
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
      // The bar itself, which happens only when no command carries the tab
      // stop. Handed straight on when there IS one: a menubar is not somewhere
      // to stand. When there is not, it keeps the focus and shows a ring,
      // because a tab stop nobody can see is worse than one nobody wanted.
      if (event.target !== event.currentTarget) return;
      first(items.items())?.focus();
    },
    [onFocus, items],
  );

  // THE TAB STOP GOES ON A COMMAND, as soon as there is one to put it on. Read
  // off the family at the moment the bar's own node is attached, which is after
  // its commands have registered — React sets a parent's ref last.
  const seed = useCallback(
    (node: HTMLElement | null) => {
      if (!node) return;
      setActiveId((current) => current ?? items.items()[0]?.data.id ?? null);
    },
    [items],
  );

  return (
    <MenubarContext.Provider value={value}>
      <div
        // Before the spread: a page may hold more than one bar, and a name is
        // the one thing only the consumer can supply.
        aria-label={label}
        {...rest}
        ref={mergeRefs(items.rootRef, seed, ref)}
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

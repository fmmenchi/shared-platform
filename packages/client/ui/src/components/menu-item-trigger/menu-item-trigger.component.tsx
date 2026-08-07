import {
  useCallback,
  useEffect,
  useId,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import { cn } from '../../util/cn.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import {
  useDescendant,
  emptyDescendants,
} from '../../primitives/use-descendants.js';
import { useDirection } from '../../i18n/provider.js';
import { useMenuPart } from '../menu/menu.context.js';
import type { MenuItemData } from '../menu/menu.context.js';
import { inlineEnd } from '../menu/menu.keyboard.js';
import { isOpen, surfaceOf } from '../menu/surface-of.js';
import type { MenuItemTriggerProps } from './menu-item-trigger.types.js';
import styles from '../menu-item/menu-item.module.css';

/**
 * A command that opens a submenu instead of running.
 *
 * It is the ONE part a submenu needs that a menu did not already have,
 * because a submenu is a `Menu` — same role, same arrows, same typing, same
 * sheet on a touch screen. This is where the two menus meet: it is a command
 * of the OUTER one and the trigger of the INNER one.
 *
 * That is also why it cannot be a `MenuItem` with extra props. A `Menu` inside
 * a `MenuContent` shadows the outer context for everything under it, so an item
 * here would register with the menu it OPENS — invisible to the arrows that
 * should reach it, and counted among the commands it is supposed to lead to.
 * It registers with `parent` and opens `surfaceId`, which is the whole trick.
 *
 * The style is `MenuItem`'s own module, imported rather than copied: two
 * stylesheets for one row is how a hover state ends up on one of them.
 */
function MenuItemTrigger(props: MenuItemTriggerProps) {
  const {
    className,
    children,
    ref,
    onFocus,
    onKeyDown,
    onPointerEnter,
    onClick,
    textValue,
    disabled: inert,
    ...rest
  } = props;
  const menu = useMenuPart('MenuItemTrigger');
  const direction = useDirection();
  const id = useId();

  const disabled = inert === true;
  const parent = menu?.parent;
  const bar = parent?.bar;
  const surfaceId = menu?.surfaceId;

  // The OUTER family: this is a command of the menu it sits in, not of the one
  // it opens.
  const descendantRef = useDescendant(
    parent?.items ?? emptyDescendants<MenuItemData>(),
    {
      id,
      textValue,
    },
  );

  const setActiveId = parent?.setActiveId;

  // GOING AWAY, and saying so. The tab stop is an id in the family's state, and
  // a command that unmounts while holding it leaves it pointing at nothing:
  // measured on a bar, no command then carried `tabindex="0"` and the whole bar
  // dropped out of the tab order. A menu recovers because its surface takes the
  // focus; a bar has no surface to fall back on.
  useEffect(
    () => () => setActiveId?.((current) => (current === id ? null : current)),
    [setActiveId, id],
  );

  const handleFocus = useCallback(
    (event: FocusEvent<HTMLButtonElement>) => {
      onFocus?.(event);
      setActiveId?.(id);
    },
    [onFocus, setActiveId, id],
  );

  const handlePointerEnter = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      onPointerEnter?.(event);
      event.currentTarget.focus();

      // ON A BAR, the pointer carries an open menu the way the arrows do. Not
      // hover-to-open — nothing opens if nothing was open — but once the reader
      // has opened one, sweeping along the bar is how an application menu is
      // read, and focusing without carrying left the menu they had walked away
      // from standing over the page with the tab stop somewhere else.
      if (!bar || !parent) return;
      if (!parent.items.items().some((c) => isOpen(c.element))) return;
      const surface = surfaceOf(event.currentTarget);
      if (surface && !surface.matches(':popover-open')) surface.showPopover();
    },
    [onPointerEnter, bar, parent],
  );

  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      // Inert: the button is not `disabled` as far as the platform is
      // concerned, so the click would otherwise reach `popovertarget` and open
      // a submenu the user was told they could not have.
      if (disabled) {
        event.preventDefault();
        return;
      }
      onClick?.(event);
    },
    [onClick, disabled],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented || disabled) return;

      // INTO the menu this command opens, and which key that is depends on
      // where the menu will BE.
      //
      // Hanging off a horizontal bar it is below, so Down opens it at the first
      // command and Up at the LAST — the APG's rule for a menubar, and the only
      // way to reach the end of a long menu in one key. Beside its command —
      // a submenu, or a vertical bar — it is the inline-end arrow, which is
      // ArrowRight where text runs left to right and ArrowLeft where it does
      // not. On a horizontal bar the inline arrows are the BAR's: they walk the
      // commands along it, so this must not take them.
      //
      // Enter and Space need nothing — they click, and the click opens it.
      const at =
        bar === 'horizontal'
          ? OPEN_AT_ON_A_BAR[event.key]
          : event.key === inlineEnd(direction).forward
            ? 'first'
            : undefined;
      if (!at) return;

      event.preventDefault();
      const surface = surfaceId ? document.getElementById(surfaceId) : null;
      if (!surface || surface.matches(':popover-open')) return;
      // Written ON THE SURFACE, not into React state: the `toggle` that follows
      // fires before a re-render, so a state update here would be read by a
      // handler still closed over the previous value.
      surface.dataset.openAt = at;
      surface.showPopover();
    },
    [onKeyDown, disabled, direction, surfaceId, bar],
  );

  return (
    <button
      type="button"
      role="menuitem"
      {...rest}
      ref={mergeRefs(descendantRef, menu?.setAnchor, ref)}
      id={id}
      aria-disabled={disabled || undefined}
      aria-haspopup="menu"
      aria-expanded={menu?.open ?? false}
      popoverTarget={disabled ? undefined : surfaceId}
      tabIndex={parent?.activeId === id ? 0 : -1}
      onClick={handleClick}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
      onPointerEnter={handlePointerEnter}
      className={cn(styles.item, className)}
    >
      {children}
    </button>
  );
}

/** Which end of a bar's menu the two vertical arrows open it at. */
const OPEN_AT_ON_A_BAR: Record<string, 'first' | 'last' | undefined> = {
  ArrowDown: 'first',
  ArrowUp: 'last',
};

export { MenuItemTrigger };

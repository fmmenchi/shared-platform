import {
  useCallback,
  useId,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import { cn } from '../../util/cn.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { useDescendant } from '../../primitives/use-descendants.js';
import { useDirection } from '../../i18n/provider.js';
import { useMenuPart } from '../menu/menu.context.js';
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
  const surfaceId = menu?.surfaceId;

  // The OUTER family: this is a command of the menu it sits in, not of the one
  // it opens.
  const descendantRef = useDescendant(parent?.items ?? EMPTY_FAMILY, {
    id,
    textValue,
  });

  const setActiveId = parent?.setActiveId;

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
    },
    [onPointerEnter],
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

      // INTO the submenu, and which physical key that is depends on the
      // reader's language: the submenu opens on the inline-end side, so it is
      // ArrowRight where text runs left to right and ArrowLeft where it does
      // not. Enter and Space need nothing — they click, and the click opens it.
      const forward = direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
      if (event.key !== forward) return;

      event.preventDefault();
      const surface = surfaceId ? document.getElementById(surfaceId) : null;
      if (surface && !surface.matches(':popover-open')) surface.showPopover();
    },
    [onKeyDown, disabled, direction, surfaceId],
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

/** Outside a `Menu` there is no family to join; the warning has already fired. */
const EMPTY_FAMILY = {
  rootRef: () => undefined,
  items: () => [],
  indexOf: () => -1,
  registry: {
    add: () => undefined,
    update: () => undefined,
    remove: () => undefined,
  },
};

export { MenuItemTrigger };

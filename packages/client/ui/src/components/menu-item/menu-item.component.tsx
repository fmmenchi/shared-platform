import { useCallback, useId, type MouseEvent } from 'react';
import { cn } from '../../util/cn.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { useDescendant } from '../../primitives/use-descendants.js';
import { useMenuPart } from '../menu/menu.context.js';
import type { MenuItemProps } from './menu-item.types.js';
import styles from './menu-item.module.css';

/**
 * One command. It joins the menu's descendants, so the arrows know where it sits
 * without anyone counting.
 *
 * ONE TAB STOP: only the active item carries `tabindex="0"`; the rest are `-1`
 * and reachable with the arrows. That is the APG contract for a menu, and it is
 * the opposite of what the platform does on its own — measured, `Tab` walked
 * straight into the items.
 */
function MenuItem(props: MenuItemProps) {
  const { className, children, ref, onClick, onPointerEnter, ...rest } = props;
  const menu = useMenuPart('MenuItem');
  const id = useId();

  const disabled = props.disabled === true;
  const label = typeof children === 'string' ? children : '';
  const family = menu?.items;
  const descendantRef = useDescendant(
    // The family is always the same object for a given menu; outside one there
    // is nothing to join, and the part has already warned.
    family ?? EMPTY_FAMILY,
    { id, disabled, label },
  );

  const setActiveId = menu?.setActiveId;
  const close = menu?.close;

  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      if (event.defaultPrevented) return;
      // A command runs and the menu goes: staying open would leave the user
      // looking at a list of things they have already done.
      close?.();
    },
    [onClick, close],
  );

  const handlePointerEnter = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      onPointerEnter?.(event);
      // The pointer moves the active item, so the keyboard picks up where the
      // mouse left off (APG). It does NOT focus it: that would fight a user who
      // is typing while the pointer happens to rest over the menu.
      if (!disabled) setActiveId?.(id);
    },
    [onPointerEnter, disabled, setActiveId, id],
  );

  return (
    <button
      type="button"
      role="menuitem"
      {...rest}
      ref={mergeRefs(descendantRef, ref)}
      id={id}
      tabIndex={menu?.activeId === id ? 0 : -1}
      onClick={handleClick}
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

export { MenuItem };

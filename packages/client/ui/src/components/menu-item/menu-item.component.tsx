import {
  useCallback,
  useId,
  type FocusEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react';
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
 * and reachable with the arrows. That is the APG contract for a menu, and the
 * opposite of what the platform does on its own — measured, `Tab` walked
 * straight into the items.
 *
 * THE ACTIVE ITEM IS THE FOCUSED ITEM, and that is one fact rather than two.
 * The first version kept `activeId` in state and moved the focus separately: the
 * arrows read `document.activeElement` while hovering wrote the state, so
 * hovering a row and pressing Down continued from the OLD row — and both rows
 * were painted at once, because hover and focus were two CSS rules. Hovering
 * now focuses, `onFocus` is what sets the active id, and `data-active` paints
 * exactly one row.
 */
function MenuItem(props: MenuItemProps) {
  const {
    className,
    children,
    ref,
    onClick,
    onFocus,
    onPointerEnter,
    ...rest
  } = props;
  const menu = useMenuPart('MenuItem');
  const id = useId();

  const disabled = props.disabled === true;
  const descendantRef = useDescendant(menu?.items ?? EMPTY_FAMILY, {
    id,
    disabled,
  });

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
      // Hovering FOCUSES (the APG's "the pointer and the keyboard share one
      // cursor"), so the next arrow continues from the mouse. Setting a state
      // instead, as the first version did, left the two disagreeing.
      if (!disabled) event.currentTarget.focus();
    },
    [onPointerEnter, disabled],
  );

  return (
    <button
      type="button"
      role="menuitem"
      {...rest}
      ref={mergeRefs(descendantRef, ref)}
      id={id}
      tabIndex={menu?.activeId === id ? 0 : -1}
      data-active={menu?.activeId === id ? '' : undefined}
      onClick={handleClick}
      onFocus={handleFocus}
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

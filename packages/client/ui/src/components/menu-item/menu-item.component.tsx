import { cn } from '../../util/cn.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { useMenuCommand } from '../menu/use-menu-command.js';
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
 * A DISABLED COMMAND IS `aria-disabled`, NOT `disabled`, which is the one place
 * this design system does not take the native attribute. The APG is explicit —
 * "disabled menu items are focusable but cannot be activated" — and the reason
 * is what `role="menu"` does to a screen reader: NVDA and JAWS switch into
 * focus mode, where the virtual cursor is off and the arrows are the only way
 * through. A natively disabled item is skipped by those arrows, so the user is
 * never told the command exists. Native `disabled` announces it only to
 * VoiceOver, whose reading cursor walks the tree regardless. Focusable and
 * inert loses nothing and tells everybody.
 *
 * THE ACTIVE ITEM IS THE FOCUSED ITEM, and that is one fact rather than two.
 * The first version kept `activeId` in state and moved the focus separately: the
 * arrows read `document.activeElement` while hovering wrote the state, so
 * hovering a row and pressing Down continued from the OLD row — and both rows
 * were painted at once, because hover and focus were two CSS rules. Hovering
 * now focuses, and the stylesheet paints `:focus`: one fact, owned by the
 * engine, so two rows cannot be lit even by mistake.
 */
function MenuItem(props: MenuItemProps) {
  const {
    className,
    children,
    ref,
    onClick,
    onFocus,
    onPointerEnter,
    textValue,
    closeOnSelect,
    // OUT of the spread, and that is the whole mechanism: reaching the element,
    // the native attribute would take the button out of the focus order and
    // undo everything above.
    disabled: inert,
    ...rest
  } = props;

  const { ref: commandRef, getCommandProps } = useMenuCommand({
    disabled: inert,
    textValue,
    closeOnSelect,
  });

  return (
    <button
      type="button"
      role="menuitem"
      ref={mergeRefs(commandRef, ref)}
      {...getCommandProps({
        ...rest,
        onClick,
        onFocus,
        onPointerEnter,
        className: cn(styles.item, className),
      })}
    >
      {children}
    </button>
  );
}

export { MenuItem };

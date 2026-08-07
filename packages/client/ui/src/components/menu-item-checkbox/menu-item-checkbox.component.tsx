import { cn } from '../../util/cn.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { Checkbox } from '../checkbox/checkbox.component.js';
import { useMenuCommand } from '../menu/use-menu-command.js';
import type { MenuItemCheckboxProps } from './menu-item-checkbox.types.js';
import styles from '../menu-item/menu-item.module.css';

/**
 * A command that is also a switch: "Show sidebar", "Word wrap".
 *
 * THE MARK IS A REAL CHECKBOX, and that is the platform's own instruction
 * rather than a preference: "ARIA in HTML" lists `menuitemcheckbox` among the
 * roles allowed on `<input type="checkbox">`. Measured before believing it —
 * the role resolves, the checked state comes through from the native property,
 * and `appearance` stays `auto`, so the browser goes on drawing the box, the
 * tick, the disabled shading and the High Contrast treatment. A tick in a menu
 * and a tick in a form are therefore the same tick, by construction and not by
 * imitation, which is what no amount of drawing our own could have given.
 *
 * The state belongs to the DOM for the same reason it does in a form: the
 * browser paints this control, so it keeps it — `form.reset()` works, and there
 * is no second copy to drift. The props are `Checkbox`'s own (`checked`,
 * `defaultChecked`, `onChange`), because it IS one.
 *
 * WHY THE ROLE MATTERS, since the box could be drawn without it: inside
 * `role="menu"` a plain checkbox is announced as a checkbox in a list of
 * commands, and the arrows would be the only way to it while `Tab` walked in.
 * With the role it is "Show sidebar, checked, menu item" and the menu's one tab
 * stop holds.
 *
 * The ROW is the `<label>` — which is what names the control, so the text is
 * written once and both the accessibility tree and typing read the same copy.
 */
function MenuItemCheckbox(props: MenuItemCheckboxProps) {
  const {
    className,
    children,
    ref,
    onClick,
    onFocus,
    onPointerEnter,
    textValue,
    closeOnSelect,
    // OUT of the spread: reaching the input, the native attribute would take it
    // out of the focus order, and a menu's disabled command stays focusable.
    disabled: inert,
    ...rest
  } = props;

  const { ref: commandRef, getCommandProps } = useMenuCommand({
    disabled: inert,
    textValue,
    closeOnSelect,
  });

  return (
    <label className={cn(styles.item, className)}>
      <Checkbox
        role="menuitemcheckbox"
        ref={mergeRefs(commandRef, ref)}
        {...getCommandProps({
          ...rest,
          onClick,
          onFocus,
          onPointerEnter,
        })}
      />
      {children}
    </label>
  );
}

export { MenuItemCheckbox };

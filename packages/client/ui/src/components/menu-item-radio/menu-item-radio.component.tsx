import { cn } from '../../util/cn.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { Radio } from '../radio/radio.component.js';
import { useMenuCommand } from '../menu/use-menu-command.js';
import type { MenuItemRadioProps } from './menu-item-radio.types.js';
import styles from '../menu-item/menu-item.module.css';

/**
 * One choice of a set, inside a menu: "Sort by → Date / Name / Size".
 *
 * A REAL RADIO, for the same reason its sibling is a real checkbox — "ARIA in
 * HTML" allows exactly `menuitemradio` on `<input type="radio">` — so the dot,
 * its High Contrast treatment and the browser's own grouping by `name` are all
 * the platform's. Give the set a shared `name` and the browser enforces the one
 * invariant that matters here, that only one of them is chosen; nothing of ours
 * could enforce it as well, and a set where two rows read "selected" is the
 * defect this component exists to make impossible.
 *
 * Put them in a `MenuGroup` so the set has a NAME as well as a rule: that is
 * what turns "Date, selected" into "Sort by, Date, 1 of 3, selected".
 */
function MenuItemRadio(props: MenuItemRadioProps) {
  const {
    className,
    children,
    ref,
    onClick,
    onFocus,
    onPointerEnter,
    textValue,
    closeOnSelect,
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
      <Radio
        role="menuitemradio"
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

export { MenuItemRadio };

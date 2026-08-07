import { useId } from 'react';
import type { MenuGroupProps } from './menu-group.types.js';
import styles from './menu-group.module.css';

/**
 * A NAMED SET of commands inside a menu: "Sort by", "Zoom".
 *
 * It is what turns three rows that happen to sit together into a set a screen
 * reader can describe. Without it a radio row announces "Date, selected" and
 * the user is not told what was selected, nor that there are two other
 * answers; inside one it is "Sort by, Date, 1 of 3, selected". That count and
 * that name are the whole component.
 *
 * `role="group"` is one of the roles a `menu` is allowed to own, alongside its
 * commands — so this nests without anything else changing: the arrows, typing
 * and the roving tab stop all walk the commands inside it, because they are
 * found by walking the surface rather than by counting children.
 */
function MenuGroup(props: MenuGroupProps) {
  const { label, className, children, ...rest } = props;
  const labelId = useId();

  return (
    <div
      role="group"
      {...rest}
      // AFTER the spread: the name is the reason this element exists.
      aria-labelledby={labelId}
      className={className}
    >
      {/* Not a heading: a heading inside a menu is a landmark-shaped thing in a
          list of commands, and a screen reader in focus mode would not read it
          anyway. It earns its place by being the visible copy of the name that
          `aria-labelledby` points at — one string, read by both. */}
      <div id={labelId} className={styles.label}>
        {label}
      </div>
      {children}
    </div>
  );
}

export { MenuGroup };

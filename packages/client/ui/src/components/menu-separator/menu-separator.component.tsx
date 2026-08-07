import { cn } from '../../util/cn.js';
import type { MenuSeparatorProps } from './menu-separator.types.js';
import styles from './menu-separator.module.css';

/**
 * A line between groups of commands — "Cut, Copy, Paste ── Select all".
 *
 * An `<hr>`, whose implicit role is already `separator`, so there is no role to
 * write: `separator` is one of the roles a `menu` may own. It is not focusable
 * and joins no family, so the arrows, typing and the tab stop pass straight
 * over it — a separator is a thing to see, not a thing to reach.
 */
function MenuSeparator(props: MenuSeparatorProps) {
  const { className, ...rest } = props;
  return <hr {...rest} className={cn(styles.separator, className)} />;
}

export { MenuSeparator };

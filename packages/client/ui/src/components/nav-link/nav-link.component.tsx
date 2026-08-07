import type { ElementType } from 'react';
import { cn } from '../../util/cn.js';
import type { NavLinkProps } from './nav-link.types.js';
import styles from './nav-link.module.css';

/**
 * One destination. An `<li>` around an `<a>`, because the list is what a screen
 * reader counts and what the W3C navigation tutorial marks up.
 *
 * It carries no state and no handlers: a link is the one control the browser
 * already does perfectly — middle-click, long-press, open in a new tab, the
 * status bar showing where it goes. Anything that intercepts a click takes all
 * of that away.
 */
function NavLink(props: NavLinkProps) {
  const { as, current, className, children, ...rest } = props;
  const Component = (as ?? 'a') as ElementType;

  return (
    <li className={styles.item}>
      <Component
        {...rest}
        aria-current={current ? 'page' : undefined}
        className={cn(styles.link, className)}
      >
        {children}
      </Component>
    </li>
  );
}

export { NavLink };

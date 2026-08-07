import { useMemo } from 'react';
import { cn } from '../../util/cn.js';
import { NavContext } from './nav.context.js';
import type { NavContextValue } from './nav.context.js';
import type { NavProps } from './nav.types.js';
import styles from './nav.module.css';

/**
 * A set of links, with groups that open.
 *
 *     <Nav label="Main">
 *       <NavLink href="/">Home</NavLink>
 *       <NavGroup label="Products">
 *         <NavLink href="/tea">Tea</NavLink>
 *         <NavLink href="/coffee">Coffee</NavLink>
 *       </NavGroup>
 *     </Nav>
 *
 * NOT a menu, and the difference is not cosmetic. A `Menu` and a `Menubar` are
 * lists of COMMANDS: one tab stop, arrows to walk them, `Tab` to leave. This is
 * a list of LINKS, so the browser's own tab order is already right, and taking
 * it over is what the `menu` roles would commit us to. The published reason for
 * refusing them is aria-practices issue #353 — the roles are "often considered
 * unnecessary for website navigation and at worst can confuse users who are
 * familiar with established website patterns" — which is the reason Radix gives
 * for its own navigation component.
 *
 * So there is no `role="menu"` in this family, no roving focus, and nothing to
 * learn: `Tab` walks the links, `Enter` opens a group, `Escape` closes it.
 *
 * It renders the landmark and the list — `<nav><ul>` — because a list is what a
 * screen reader counts ("list, 5 items") and what the W3C navigation tutorial
 * marks up.
 *
 * IT HOLDS NO STATE. Which group is open is the group's own business, and for
 * a bar it is the PLATFORM's: a flyout is a popover, so opening one closes the
 * others without anything here arbitrating. What used to be a record of open
 * ids, a toggle, a per-id close and a focus-out sweep is now this component's
 * two elements and one context field.
 */
function Nav(props: NavProps) {
  const {
    label,
    orientation = 'horizontal',
    className,
    children,
    ...rest
  } = props;

  const value = useMemo<NavContextValue>(
    () => ({ orientation }),
    [orientation],
  );

  return (
    <NavContext.Provider value={value}>
      <nav
        // BEFORE the spread, unlike the contract attributes elsewhere in this
        // family: `label` is a NAME, and a consumer who has a better one — an
        // `aria-labelledby` pointing at a heading they already show — should
        // win. `aria-expanded` and `aria-controls` come after their spread
        // because those are not opinions.
        aria-label={label}
        {...rest}
        // The hook this module's own stylesheet reads. A DATA ATTRIBUTE and not
        // this module's class, because that class is hashed at build time: a
        // `:global(.horizontal)` in another file would compile to a selector
        // that matches nothing, silently. Each part carries its own copy on its
        // own element for the same reason — see `NavGroup`, which cannot select
        // on an ancestor's hashed class either, and must not select on a bare
        // `[data-orientation]` because that attribute belongs to half the
        // component libraries in the world.
        data-orientation={orientation}
        className={cn(styles.nav, className)}
      >
        <ul className={styles.list}>{children}</ul>
      </nav>
    </NavContext.Provider>
  );
}

export { Nav };

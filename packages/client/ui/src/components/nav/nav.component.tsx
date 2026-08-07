import { useCallback, useMemo, useState, type FocusEvent } from 'react';
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
 * a list of LINKS, so the browser's own tab order is already right, and the W3C
 * navigation tutorial says why taking it over is wrong: "submenus should not
 * open when using the tab key to navigate through the menu, as keyboard users
 * would then have to step through all submenu items to get to the next
 * top-level item".
 *
 * So there is no `role="menu"` in this family, no roving focus, and nothing to
 * learn: `Tab` walks the links, `Enter` opens a group, `Escape` closes it.
 *
 * It renders the landmark and the list — `<nav><ul>` — because a list is what a
 * screen reader counts ("list, 5 items") and what the tutorial marks up.
 */
function Nav(props: NavProps) {
  const {
    label,
    orientation = 'horizontal',
    className,
    children,
    onBlur,
    ...rest
  } = props;

  // The ONE record of what is open. A group asking itself would let two of them
  // disagree, and the horizontal rule — at most one — could not be kept at all.
  const [open, setOpen] = useState<readonly string[]>([]);

  const toggle = useCallback(
    (id: string) => {
      setOpen((current) =>
        current.includes(id)
          ? current.filter((other) => other !== id)
          : orientation === 'horizontal'
            ? [id]
            : [...current, id],
      );
    },
    [orientation],
  );

  const close = useCallback((id: string) => {
    setOpen((current) => current.filter((other) => other !== id));
  }, []);

  const handleBlur = useCallback(
    (event: FocusEvent<HTMLElement>) => {
      onBlur?.(event);
      // "Moving focus out of the navigation region also closes an open
      // dropdown" (APG) — and only a flyout: a sidebar section that shut itself
      // because the reader tabbed into the page would lose their place.
      if (orientation !== 'horizontal') return;
      if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
        return;
      }
      setOpen([]);
    },
    [onBlur, orientation],
  );

  const value = useMemo<NavContextValue>(
    () => ({ orientation, open, toggle, close }),
    [orientation, open, toggle, close],
  );

  return (
    <NavContext.Provider value={value}>
      <nav
        aria-label={label}
        {...rest}
        // The hook the group's own stylesheet reads. A DATA ATTRIBUTE and not
        // this module's class, because that class is hashed at build time: a
        // `:global(.horizontal)` in the other file would compile to a selector
        // that matches nothing, silently.
        data-orientation={orientation}
        onBlur={handleBlur}
        className={cn(styles.nav, className)}
      >
        <ul className={styles.list}>{children}</ul>
      </nav>
    </NavContext.Provider>
  );
}

export { Nav };

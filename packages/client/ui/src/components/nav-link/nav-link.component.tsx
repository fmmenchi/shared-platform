import { cn } from '../../util/cn.js';
import { useInjectedCurrent } from '../../primitives/use-injected-current.js';
import { useLinkElement } from '../../primitives/use-link-element.js';
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
  const { as, asChild, current, className, children, ...rest } = props;

  // Which element renders — the injected router link, a plain anchor for a
  // destination that leaves the app, `as`, or the slotted child — is the
  // shared decision `useLinkElement` documents; `BreadcrumbLink` makes the
  // same one, which is why it is a primitive and not this component's.
  const { Component, external } = useLinkElement('NavLink', {
    as,
    asChild,
    href: rest.href,
  });

  // THREE levels, most specific first. An explicit `current` wins, because it
  // is the only one that can know what matching cannot. Then the adapter, if
  // the app gave one. Outside the chain entirely: an injected `Link` that marks
  // ITSELF — React Router's `NavLink`, TanStack's `activeProps` — since it
  // renders the element and its own attribute lands last.
  // Not asked for an external href: it can never be where the reader is, and
  // asking sends another site's URL into the app's own matcher.
  const fromAdapter = useInjectedCurrent(external ? undefined : rest.href);
  const active = current ?? fromAdapter;

  return (
    <li className={styles.item}>
      <Component
        // BEFORE the spread. After it, an `undefined` from a link that is not
        // current DELETED a consumer's own `aria-current` — the attribute has
        // seven legal values and this prop expressed one, so the escape hatch
        // was not merely unused but unreachable.
        aria-current={active === true ? 'page' : active || undefined}
        {...rest}
        className={cn(styles.link, className)}
      >
        {children}
      </Component>
    </li>
  );
}

export { NavLink };

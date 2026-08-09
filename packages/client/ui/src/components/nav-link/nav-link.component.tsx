import type { ElementType } from 'react';
import { cn } from '../../util/cn.js';
import { useUiAdapters } from '../../i18n/provider.js';
import { useInjectedCurrent } from './nav-link.current.js';
import { isExternalHref } from '../../primitives/is-external-href.js';
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

  /*
   * THE ROUTER COMES FROM THE PROVIDER, not from every call site. `Link` is an
   * adapter this design system already declares — injected once, next to the
   * locale and the form binding — and this is its first consumer, so it is also
   * the first time that port is put to work rather than described.
   *
   * `as` stays as the per-call override, for the link that must NOT go through
   * the router: an absolute URL to another site, a download, a `mailto:`. Read
   * tolerantly, so a `NavLink` outside a provider is still a plain anchor.
   */
  const injected = useUiAdapters()?.Link;
  // A destination that LEAVES the app never goes through the router, and the
  // component decides that rather than asking the caller to remember: `as="a"`
  // was the only defence, so forgetting it handed `https://…` or a `mailto:` to
  // a client-side router. It is the same call this component already makes —
  // which element renders — applied to the one case where the answer is in the
  // href itself.
  const external = isExternalHref(rest.href);
  // THREE levels, most specific first. An explicit `current` wins, because it
  // is the only one that can know what matching cannot. Then the adapter, if
  // the app gave one. Outside the chain entirely: an injected `Link` that marks
  // ITSELF — React Router's `NavLink`, TanStack's `activeProps` — since it
  // renders the element and its own attribute lands last.
  // Not asked for an external href: it can never be where the reader is, and
  // asking sends another site's URL into the app's own matcher.
  const fromAdapter = useInjectedCurrent(external ? undefined : rest.href);
  const active = current ?? fromAdapter;
  const Component = (as ?? (external ? 'a' : injected) ?? 'a') as ElementType;

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

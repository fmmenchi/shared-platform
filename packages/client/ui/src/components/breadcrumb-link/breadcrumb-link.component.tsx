import { cn } from '../../util/cn.js';
import { useInjectedCurrent } from '../nav-link/nav-link.current.js';
import { useLinkElement } from '../../primitives/use-link-element.js';
import type { BreadcrumbLinkProps } from './breadcrumb-link.types.js';
import styles from './breadcrumb-link.module.css';

/**
 * One level of the trail. An `<li>` around an `<a>`, the same shape `NavLink`
 * settled on and for the same reason: the list is what a screen reader counts.
 *
 * The separator that precedes it is painted by the stylesheet on every item
 * after the first — no element, so there is nothing to hide from the
 * accessibility tree and nothing for a copy-paste to drag along.
 */
function BreadcrumbLink(props: BreadcrumbLinkProps) {
  const { as, asChild, current, className, children, ...rest } = props;

  // Which element renders — the injected router link, a plain anchor for a
  // destination that leaves the app, `as`, or the slotted child — is the one
  // decision `useLinkElement` documents, shared with `NavLink`.
  const { Component, external } = useLinkElement('BreadcrumbLink', {
    as,
    asChild,
    href: rest.href,
  });

  // The adapter's answer, minus exactly ONE dialect: `location`. A trail is
  // made of the sections that contain the page — every ancestor crumb is
  // trivially the reader's "current location", so that answer says nothing a
  // screen reader user does not already know from the list itself, N times
  // over. Everything else passes: `true` because the port's contract says it
  // means `page` (the simplest legal adapter answers booleans, and a filter
  // that only knew the string marked nothing), `step` because a matcher that
  // knows the flow outranks this component's guess about hierarchies. The
  // explicit prop is never filtered — the call site knows what matching
  // cannot.
  const fromAdapter = useInjectedCurrent(external ? undefined : rest.href);
  const active =
    current ?? (fromAdapter === 'location' ? undefined : fromAdapter);

  return (
    <li className={styles.item}>
      <Component
        // BEFORE the spread, so an `undefined` from a crumb that is not
        // current cannot delete a consumer's own `aria-current` — the same
        // escape hatch `NavLink` had to reopen once already.
        aria-current={active === true ? 'page' : active || undefined}
        {...rest}
        className={cn(styles.link, className)}
      >
        {children}
      </Component>
    </li>
  );
}

export { BreadcrumbLink };

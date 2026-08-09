import { Link } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import type { LinkComponent } from '@fmmenchi/ui';

/**
 * `@fmmenchi/ui`'s link port, implemented for TanStack Router.
 *
 * Two things happen here, and only the first is obvious.
 *
 * THE RENAME. The port is `href` — the HTML attribute, the one name no router
 * invented — and TanStack navigates on `to`, which is TYPED against your route
 * tree, so a string is deliberately not assignable. The cast spends that
 * guarantee once, here, rather than at every call site: the design system's
 * props are `href: string` and cannot be anything else without the port
 * learning about TanStack. What it costs is real — a typo in a `NavLink` href
 * is a runtime miss where the same typo in a TanStack `Link` would not build.
 *
 * THE HANDOVER. TanStack's `Link` marks itself: it writes
 * `aria-current="page"` whenever it considers itself active, and `activeOptions`
 * defaults to NON-exact, so the parent of the page you are on claims to BE the
 * page you are on. Measured, at `/settings/profile`: both `Settings` and
 * `Profile` carried `aria-current="page"`, so a screen reader announced
 * "current page" twice in one menu and neither was distinguishable from the
 * other. Its value also beat the one the design system passed in, which is how
 * this was found rather than reasoned about.
 *
 * `activeOptions.exact` is the only lever, and it had to be found by reading
 * the source rather than the API: the attribute is spread LAST, after
 * `activeProps`, after `inactiveProps`, after the caller's own props
 * (`...isActive && STATIC_ACTIVE_PROPS`), so nothing can override it and the
 * obvious fix — handing `activeProps` the value we want — changes nothing at
 * all. What is left is to narrow what "active" MEANS: exact, so the link marks
 * the page and stops claiming its ancestors.
 *
 * The section is then answered by `useTanstackIsCurrent`, which asks the same
 * router and can say `location` — a claim TanStack's link has no way to make,
 * since the attribute it writes is the literal string `page`.
 */
export const TanstackLink: LinkComponent = ({
  href,
  ...rest
}): ReactElement => (
  <Link to={href as never} activeOptions={{ exact: true }} {...rest} />
);

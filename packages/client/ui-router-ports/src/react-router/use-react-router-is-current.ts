import { useLocation, useResolvedPath } from 'react-router';
import type { UseIsCurrent } from '@fmmenchi/ui';

/**
 * `@fmmenchi/ui`'s "is this where the reader already is?" port, for React
 * Router — and the reason a per-router binding beats the generic matcher.
 *
 * What it adds over `pathIsCurrent` is NOT the basename, and saying so was
 * wrong: `useLocation()` already reports the pathname with the basename
 * stripped, so feeding that to the generic matcher works. Measured — replacing
 * the resolution below with the raw href left every assertion green.
 *
 * What it does add is RESOLUTION: `useResolvedPath` turns the destination into
 * the path the router will actually navigate to, so a relative href
 * (`profile`, `..`) is answered against the route it sits in rather than not
 * being answered at all, and a splat or an encoded segment is compared in the
 * form the router uses rather than the form it was typed in.
 *
 * The matching is React Router's own, from `NavLink`: exact is the page,
 * prefix-to-a-segment-boundary is the location, and comparison is
 * case-insensitive — `/Settings` and `/settings` are one page, which is what
 * every server that serves both already believes.
 */
export const useReactRouterIsCurrent: UseIsCurrent = (href) => {
  const resolved = useResolvedPath(href);
  const { pathname } = useLocation();

  const here = pathname.toLowerCase();
  const target = resolved.pathname.toLowerCase();

  if (here === target) return 'page';
  // A SEGMENT boundary, never a bare prefix: `/team` must not light up for
  // `/teams`. The root is a prefix of everything and is handled by it too —
  // `/` ends in the separator already, so the charAt lands past the string.
  return here.startsWith(target) && here.charAt(target.length) === '/'
    ? 'location'
    : undefined;
};

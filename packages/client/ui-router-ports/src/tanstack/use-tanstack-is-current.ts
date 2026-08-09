import { useMatchRoute } from '@tanstack/react-router';
import type { UseIsCurrent } from '@fmmenchi/ui';

/**
 * `@fmmenchi/ui`'s "is this where the reader already is?" port, for TanStack
 * Router.
 *
 * It asks the router to MATCH rather than comparing strings, which is the
 * difference that matters here: TanStack resolves a destination through the
 * route tree, so a path with parameters in it (`/orders/$id`) is answered by
 * the route that owns it and not by whether two strings happen to be equal.
 *
 * `fuzzy` is how the two claims are told apart, and they are not the same
 * claim: an exact match is the PAGE the reader is on, a fuzzy one is a section
 * that CONTAINS it — the parent entry of a sidebar, which a screen reader
 * announces differently and must, or a menu says "current page" twice.
 */
export const useTanstackIsCurrent: UseIsCurrent = (href) => {
  const matchRoute = useMatchRoute();

  if (matchRoute({ to: href as never })) return 'page';
  return matchRoute({ to: href as never, fuzzy: true })
    ? 'location'
    : undefined;
};

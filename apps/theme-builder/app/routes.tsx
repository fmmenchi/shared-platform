import { type RouteConfig, index, route } from '@react-router/dev/routes';

/**
 * TWO ROUTES, AND THE SPLIT IS THE POINT (ADR-0033).
 *
 * `/` is the wizard: it renders under the reference theme, so a draft that fails
 * its own contrast floors cannot take down the controls that would fix it.
 * `/preview` is the demo app: the same design system, rendered under the draft.
 *
 * Two routes rather than one page with a panel, because the theme wrapper is a
 * property of the SUBTREE and a route is the cleanest subtree there is — and
 * because the preview has to be openable on its own, which is what makes it
 * usable on a small screen.
 */
export default [
  index('./routes/build.tsx'),
  route('preview', './routes/preview.tsx'),
] satisfies RouteConfig;

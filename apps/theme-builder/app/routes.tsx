import {
  type RouteConfig,
  index,
  layout,
  route,
} from '@react-router/dev/routes';

/**
 * TWO THEME SCOPES, AND ONE PAGE PER STEP (ADR-0033).
 *
 * The wizard is a LAYOUT route: it draws the stepper and the chrome once, under the
 * reference theme, and each step is a child. `/preview` is outside it, because it
 * is the one place the draft theme applies — a draft with a contrast pair below its
 * floor must not take down the controls that would fix it.
 *
 * The children are built by hand rather than from `STEPS`, and that is the one
 * duplication kept on purpose: `routes.tsx` is read at BUILD time by React Router's
 * config, so a loop over a runtime array would work and would also make the route
 * table invisible to anyone reading this file. The list is held to `STEPS` by
 * `steps.spec.ts` instead, which is the trade — one assertion for a legible file.
 */
export default [
  layout('./routes/build.tsx', [
    index('./routes/steps/colours.tsx'),
    route('palette', './routes/steps/palette.tsx'),
    route('roles', './routes/steps/roles.tsx'),
    route('review', './routes/steps/review.tsx'),
  ]),
  route('preview', './routes/preview.tsx'),
] satisfies RouteConfig;

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
 * `/` IS A REDIRECT INTO THE SEQUENCE, not a step. It used to be step one's own
 * route, which made `/` and any unknown URL the same thing to the stepper and gave
 * the sidebar's "Build" link the same target as "Brand colours" — two nav items on
 * one page, both claiming `aria-current`. Every step has a name in the URL now.
 *
 * The children are built by hand rather than from `STEPS`, and that is the one
 * duplication kept on purpose: `routes.tsx` is read at BUILD time by React Router's
 * config, so a loop over a runtime array would work and would also make the route
 * table invisible to anyone reading this file. The list is held to `STEPS` by
 * `steps.spec.ts` instead, which is the trade — one assertion for a legible file.
 */
export default [
  index('./routes/index.tsx'),
  layout('./routes/build.tsx', [
    route('steps/brand-colours', './routes/steps/brand-colours.tsx'),
    route('steps/palette', './routes/steps/palette.tsx'),
    route('steps/roles', './routes/steps/roles.tsx'),
    route('steps/review', './routes/steps/review.tsx'),
  ]),
  route('preview', './routes/preview.tsx'),
] satisfies RouteConfig;

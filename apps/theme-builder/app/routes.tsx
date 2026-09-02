import {
  type RouteConfig,
  index,
  layout,
  route,
} from '@react-router/dev/routes';

/**
 * ONE PAGE PER STEP (ADR-0033), AND NOTHING ELSE.
 *
 * The wizard is a LAYOUT route: it draws the stepper and the chrome once, under the
 * reference theme, and each step is a child. The preview is not a route: it is a rail
 * beside whichever step you are on, opened with `?preview=1` (`preview-open.ts`), and
 * the theme being built applies to that subtree alone — a draft with a contrast pair
 * below its floor must not take down the controls that would fix it.
 *
 * THERE WAS A `/preview` ROUTE, the same component at full width, and it was deleted
 * rather than given a link. Once the rail existed nothing pointed at the page — the
 * `Building`/`Preview` mode links, the step's own button and the rail's `Full width`
 * had all gone in favour of one control — and a route reachable by URL alone is the
 * worst of the three options (link it, delete it, leave it). What it offered, reading
 * all eleven sections at a width where an Alert gets its own line, the rail now gives
 * at 32rem; and a second host was the only reason the preview took a heading level.
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
] satisfies RouteConfig;

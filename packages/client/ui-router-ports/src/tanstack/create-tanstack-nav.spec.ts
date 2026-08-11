/**
 * COMPILE-TIME assertions on the typed nav kit — the same harness as
 * ui-form-ports' `field-type.spec.ts`: this package has no test runner, the
 * claim under test is what the COMPILER accepts, so `tsc` (the `typecheck`
 * target) is the harness and `@ts-expect-error` is the assertion.
 *
 * The route tree is REAL — built with TanStack's own constructors, not typed
 * by hand — so these assertions break if TanStack changes how a tree carries
 * its paths, which is exactly when they should.
 */
import {
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { createTanstackNav } from './create-tanstack-nav.js';
import type { MissingRouter } from './create-tanstack-nav.types.js';

const rootRoute = createRootRoute();
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
});
const profileRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/profile',
});
const routeTree = rootRoute.addChildren([
  settingsRoute.addChildren([profileRoute]),
]);
const router = createRouter({ routeTree });

/* ---------- Typed: an href is checked against the route tree ---------- */

const { NavLink } = createTanstackNav<typeof router>();

void NavLink({ href: '/settings', children: 'Settings' });
void NavLink({ href: '/settings/profile', children: 'Profile' });

// @ts-expect-error — '/setings' is not a route of this tree
void NavLink({ href: '/setings', children: 'Settings' });
// @ts-expect-error — the DS props survive the re-typing, so THIS still errors
void NavLink({ href: '/settings', hrefLang: 5 });

/* ---------- Without a router type, the mistake is loud ---------- */

// No type argument and no registered router: the return is a message type, so
// destructuring — the first thing every call site does — fails on it.
const missing: MissingRouter = createTanstackNav();
void missing;

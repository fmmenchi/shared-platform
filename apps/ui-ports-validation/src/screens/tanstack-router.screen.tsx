import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { UiProvider } from '@fmmenchi/ui';
import { tanstackAdapters } from '@fmmenchi/ui-router-ports/tanstack';
import {
  Menu,
  PATHS,
  Resolved,
  type RouterScreenProps,
} from './router.shared.js';

/*
 * TanStack resolves a destination through the route TREE, so the tree is the
 * fixture: without these routes registered `matchRoute` answers nothing and the
 * suite would pass on an empty menu.
 */
const rootRoute = createRootRoute({
  component: () => (
    <UiProvider adapters={{ i18n: { locale: 'en' }, ...tanstackAdapters }}>
      <Menu />
      <Outlet />
    </UiProvider>
  ),
});

const routeTree = rootRoute.addChildren(
  PATHS.map((path) =>
    createRoute({
      getParentRoute: () => rootRoute,
      path,
      component: () => <Resolved path={path} />,
    }),
  ),
);

/** The menu under TanStack Router, wired exactly as the README says. */
export function TanstackRouterScreen({ at, basename }: RouterScreenProps) {
  const router = createRouter({
    routeTree,
    basepath: basename,
    history: createMemoryHistory({ initialEntries: [at] }),
  });
  return <RouterProvider router={router as never} />;
}

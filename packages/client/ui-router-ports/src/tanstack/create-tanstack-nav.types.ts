import type { ReactNode } from 'react';
import type { AnyRouter, ToPathOption } from '@tanstack/react-router';
import type { NavLinkProps } from '@fmmenchi/ui';

/**
 * What `createTanstackNav` gives back when no router type is in reach —
 * neither passed (`createTanstackNav<typeof router>()`) nor registered
 * (`declare module '@tanstack/react-router' { interface Register … }`).
 * Without one, every path type widens to `string` and the typing would switch
 * itself off in silence; as a message it fails at the destructuring, where
 * the mistake is. The same shape `createTanstackFields` uses.
 */
export type MissingRouter =
  'createTanstackNav needs your router type — createTanstackNav<typeof router>(), or register the router (declare module "@tanstack/react-router" { interface Register { router: typeof router } })';

/** The re-typed component: same identity, `href` checked per call site. */
export interface TanstackNavKit<TRouter extends AnyRouter> {
  NavLink: <TTo extends string>(
    props: Omit<NavLinkProps, 'href'> & {
      /** A destination the route tree actually has — a typo does not compile. */
      href: ToPathOption<TRouter, string, TTo>;
    },
  ) => ReactNode;
}

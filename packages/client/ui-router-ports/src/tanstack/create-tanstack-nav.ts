import { NavLink } from '@fmmenchi/ui';
import type { AnyRouter, RegisteredRouter } from '@tanstack/react-router';
import type {
  MissingRouter,
  TanstackNavKit,
} from './create-tanstack-nav.types.js';

/**
 * The design system's `NavLink`, with `href` checked against YOUR route tree.
 *
 *     // nav.ts — beside the router, outside any component
 *     export const { NavLink } = createTanstackNav<typeof router>();
 *
 *     <NavLink href="/settings">Settings</NavLink>
 *     <NavLink href="/setings">Settings</NavLink>   // does not compile
 *
 * WHY IT EXISTS. The port is `href: string` on purpose — the design system
 * cannot know a route tree — so `TanstackLink` spends TanStack's typed-`to`
 * guarantee once, in the adapter (`to={href as never}`), and its own docblock
 * names the cost: a typo in a `NavLink` href is a runtime miss where the same
 * typo in a TanStack `Link` would not build. This buys the guarantee back at
 * the call site, the same way the form kits buy back `name`: the factory
 * RE-TYPES, it does not wrap — the component comes back with the same
 * identity, so nothing remounts and no second implementation exists.
 *
 * NOT THE SAME TOOL as the `NavLinkExtraProps` augmentation, and the two
 * compose. The augmentation types EXTRA props in the router's own vocabulary
 * (`to`, `params`, `search`) for the injected link to consume; it cannot
 * check `href`, and a link given only `to` is invisible to the design
 * system's external-destination test and to `useIsCurrent`, which read
 * `href`. This types exactly that prop — the one the design system reads —
 * so the checked path is also the working one.
 *
 * Module-level, like every kit here: a type does not travel through React
 * context, an import is what carries it across a file boundary. With the
 * router REGISTERED (TanStack's own `Register` interface) the type argument
 * can be omitted; with neither, the return is a message type and the mistake
 * fails at the destructuring rather than as every path silently widening to
 * `string`.
 */
export function createTanstackNav<
  TRouter extends AnyRouter = RegisteredRouter,
>(): unknown extends TRouter['routeTree']
  ? MissingRouter
  : TanstackNavKit<TRouter> {
  return { NavLink } as unknown as ReturnType<
    typeof createTanstackNav<TRouter>
  >;
}

import type { UiAdapters } from '@fmmenchi/ui';
import { ReactRouterLink } from './react-router-link.js';
import { useReactRouterIsCurrent } from './use-react-router-is-current.js';

/**
 * React Router, wired — the whole integration, in one spread.
 *
 * ```tsx
 * <UiProvider adapters={{ i18n, ...reactRouterAdapters }}>
 * ```
 *
 * This is the point of the package, and it is deliberately not two exports the
 * caller assembles: knowing that `Link` and `useIsCurrent` must come from the
 * SAME router is a fact about this design system, and asking a consumer to hold
 * it is asking them to learn the seam in order to cross it. Mixing them — this
 * router's link with that router's matching — is the one wiring mistake that
 * produces a menu which navigates correctly and highlights nothing, and this
 * shape makes it something you have to go out of your way to write.
 *
 * The two are still exported on their own, for the app that overrides one.
 */
export const reactRouterAdapters: Pick<UiAdapters, 'Link' | 'useIsCurrent'> = {
  Link: ReactRouterLink,
  useIsCurrent: useReactRouterIsCurrent,
};

export { ReactRouterLink } from './react-router-link.js';
export { useReactRouterIsCurrent } from './use-react-router-is-current.js';

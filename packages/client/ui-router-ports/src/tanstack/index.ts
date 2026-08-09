import type { UiAdapters } from '@fmmenchi/ui';
import { TanstackLink } from './tanstack-link.js';
import { useTanstackIsCurrent } from './use-tanstack-is-current.js';

/**
 * TanStack Router, wired — the whole integration, in one spread.
 *
 * ```tsx
 * <UiProvider adapters={{ i18n, ...tanstackAdapters }}>
 * ```
 *
 * Paired for the same reason React Router's are, plus one specific to this
 * router: `TanstackLink` narrows what TanStack calls "active" so that its own
 * `aria-current="page"` stops claiming the ancestors of the current page, and
 * `useTanstackIsCurrent` is what answers for those ancestors instead. Taking
 * one without the other leaves the menu either announcing two current pages or
 * marking none of the sections.
 */
export const tanstackAdapters: Pick<UiAdapters, 'Link' | 'useIsCurrent'> = {
  Link: TanstackLink,
  useIsCurrent: useTanstackIsCurrent,
};

export { TanstackLink } from './tanstack-link.js';
export { useTanstackIsCurrent } from './use-tanstack-is-current.js';

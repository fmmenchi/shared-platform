import { useUiAdapters } from '../../i18n/provider.js';
import type { UseIsCurrent } from '../../i18n/ports.types.js';
import type { NavLinkProps } from './nav-link.types.js';

/**
 * The app's own answer, when it gave one.
 *
 * `NONE` is what makes this legal rather than clever: the port member is
 * optional, so a naive `adapters?.useIsCurrent?.(href)` is a hook called
 * conditionally — which `react-hooks/rules-of-hooks` rejects, and rightly.
 * Substituting a stable no-op keeps the call unconditional and the hook order
 * fixed. Which implementation runs still depends on the adapters, and those are
 * given ONCE when the design system is set up: swapping them mid-life would
 * reorder hooks, which is the same contract the form binding already has.
 */
const NONE: UseIsCurrent = () => undefined;

export function useInjectedCurrent(
  href: string | undefined,
): NavLinkProps['current'] {
  // The compiler rejects a hook chosen at runtime — "Hooks must be the same
  // function on every render" — and it is right in general: a hook read from
  // context CAN change identity. Here it does not, because the adapters are
  // given once when the design system is set up, which is the contract the form
  // binding already states and opts out the same way (`form-adapter.context`).
  // Told, not fooled.
  'use no memo';

  const useIsCurrent = useUiAdapters()?.useIsCurrent ?? NONE;
  // ASKED unconditionally, ANSWERED only for a destination we would route. The
  // hook has to run either way — that is the rule of hooks — so the empty
  // string goes in and the answer comes back out and is dropped here.
  //
  // Dropping it here, and not leaving it to the adapter, because the empty
  // string is a trap this port sets rather than a question any router can
  // answer: React Router resolves `''` to the CURRENT path and TanStack matches
  // it against the root, so a menu with one `mailto:` in it would report that
  // link, or the home entry, as the page the reader is on. `pathIsCurrent`
  // refuses it in its own body and every other binding would have had to
  // remember to.
  const answer = useIsCurrent(href ?? '');
  return href ? answer : undefined;
}

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
  return useIsCurrent(href ?? '');
}

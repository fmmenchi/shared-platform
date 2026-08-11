import type { ElementType } from 'react';
import { useUiAdapters } from '../i18n/provider.js';
import { isExternalHref } from './is-external-href.js';
import { Slot } from './slot.js';
import { useDevWarning } from './use-dev-warning.js';
import type {
  UseLinkElementOptions,
  UseLinkElementResult,
} from './use-link-element.types.js';

/**
 * WHICH ELEMENT renders a link of ours — one answer for every link-shaped part.
 *
 * `NavLink` worked this out first and `BreadcrumbLink` needed the same four
 * lines; the workspace rule for a value with two consumers is that it moves,
 * because half a copy is the dangerous kind — a re-derivation that skipped the
 * external-href test would hand `mailto:` to a client-side router and look
 * right until the first click.
 *
 * THE ROUTER COMES FROM THE PROVIDER, not from every call site: `Link` is an
 * adapter this design system already declares — injected once, next to the
 * locale and the form binding. Read tolerantly, so a link outside a provider is
 * still a plain anchor.
 *
 * Precedence, most explicit first:
 *
 * - `asChild` — the caller wrote the element; `Slot` hands it our props.
 * - `as` — the per-call override, for the link that must NOT go through the
 *   router (or must, when the href reads as external but is your own origin).
 * - an external href — a destination that LEAVES the app never goes through
 *   the router, and this hook decides that rather than asking the caller to
 *   remember: `as="a"` was the only defence, so forgetting it handed
 *   `https://…` or a `mailto:` to a client-side router.
 * - the injected `Link`, then a plain anchor.
 *
 * `asChild` and `as` together is two ways of saying who renders: the child
 * wins by the precedence above and `as` does nothing — compiling,
 * autocompleting, and deciding nothing — so it warns, by the caller's name.
 */
export function useLinkElement(
  name: string,
  options: UseLinkElementOptions,
): UseLinkElementResult {
  const { as, asChild, href } = options;
  const injected = useUiAdapters()?.Link;
  useDevWarning(
    Boolean(asChild && as),
    `${name}: given both \`asChild\` and \`as\`. The child renders, so \`as\` is ignored — remove it.`,
  );
  const external = isExternalHref(href);
  const Component = (
    asChild ? Slot : (as ?? (external ? 'a' : injected) ?? 'a')
  ) as ElementType;
  return { Component, external };
}

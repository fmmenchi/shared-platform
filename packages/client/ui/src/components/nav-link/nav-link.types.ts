import type { ComponentPropsWithRef, ElementType } from 'react';

/**
 * What YOUR router's link accepts, on top of an anchor's own props.
 *
 * Empty here, and it has to be: this interface names no library, imports
 * nothing and exists at no point during a render. It is a hole the app fills.
 *
 * Extra props already reach the injected link at runtime — `NavLink` spreads
 * everything it does not consume — so what was missing was never the wiring,
 * only permission from the type. That is the whole of what this changes:
 *
 * ```ts
 * // app/ui.d.ts, written once
 * import type { LinkProps } from '@tanstack/react-router';
 *
 * declare module '@fmmenchi/ui' {
 *   interface NavLinkExtraProps
 *     extends Pick<LinkProps, 'to' | 'params' | 'search' | 'hash'> {}
 * }
 * ```
 *
 * After that `<NavLink to="/orders/$id" params={{ id }} />` is checked by
 * TanStack's own types, in TanStack's own vocabulary, and the design system
 * still has never heard of it. Declaration merging is how TanStack registers
 * its own route tree, so this is the mechanism its users already have.
 *
 * TWO things it cannot do, and both are worth knowing before reaching for it.
 * TypeScript cannot check that what you declare here matches the `Link` you
 * actually injected — augment with one router's props and inject another's and
 * it compiles. And the design system reads `href`, not `to`: a link given only
 * a route descriptor is invisible to the external-destination test and to
 * `useIsCurrent`, so marking it falls to the router's own link (TanStack's
 * does; React Router's plain `Link` does not — use its `NavLink`).
 *
 * And `as` is NOT the smaller alternative it looks like. It is typed
 * `ElementType`, which says only "something renderable" — it does not carry the
 * props of what you hand it, so `<NavLink as={Link} to="/x" />` needs this
 * augmentation just as much. Making it infer means making `NavLink`
 * polymorphic, which is a different decision and one this package has refused
 * elsewhere on purpose.
 */
/* eslint-disable-next-line @typescript-eslint/no-empty-object-type,
   @typescript-eslint/no-empty-interface --
   Empty is the POINT, and both rules are right about what they see: this is an
   open interface, and its emptiness is what an app fills by declaration
   merging. A `type` alias could not be merged into and so could not be this;
   `object` or `unknown` would give up the checking that makes it worth having.
   The width of the hole is the app's to decide, and asserted where an app can
   decide it — `nav-link-typed-props.test.tsx` in the validation app refuses an
   undeclared prop. */
export interface NavLinkExtraProps {}

export interface NavLinkProps
  extends ComponentPropsWithRef<'a'>, NavLinkExtraProps {
  /**
   * What to render instead of the app's link — for THIS link only.
   *
   * The router normally arrives once, through the `Link` adapter on
   * `UiProvider`, and every `NavLink` uses it without being told. This is the
   * exception, and a NARROW one now: an href that already says it leaves the
   * app — a scheme like `https:` or `mailto:`, or a protocol-relative `//` —
   * renders a plain anchor on its own, without being told. What is left for
   * this prop is the case the href cannot express: forcing the ROUTER back on
   * for an absolute URL to your own origin, or rendering something else
   * entirely. What it renders must end in an anchor, or the browser has
   * nothing to navigate.
   */
  as?: ElementType;
  /**
   * Marks where the reader already is. Rendered as `aria-current`, which is
   * what a screen reader announces — a colour alone says it only to those who
   * can see it (WCAG 1.4.1).
   *
   * Optional now: with a `useIsCurrent` on `UiProvider` the design system asks
   * the app instead, and this prop becomes the override for what the matching
   * cannot know. Explicit always wins.
   *
   * `true` means `'page'`, the common case. The other tokens are there because
   * a navigation asks for them: `'location'` for the SECTION you are inside —
   * the parent entry of a sidebar tree, which is not the page you are on —
   * and `'step'` in a flow. Passing `aria-current` directly works too.
   */
  current?: boolean | 'page' | 'step' | 'location' | 'date' | 'time';
}

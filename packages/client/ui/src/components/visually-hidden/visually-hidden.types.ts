import type { ElementType } from 'react';
import type { PolymorphicProps } from '../../primitives/polymorphic.js';

/**
 * Public VisuallyHidden props — polymorphic via `as`, default `span`.
 *
 * IT DECLARES NO OWN PROPS, deliberately. Declaring `children` here would put
 * it in the `Omit<…, keyof Own>` of `PolymorphicProps` and make it OPTIONAL for
 * every target — so `<VisuallyHidden as={NeedsChildren} />` would compile with
 * the required children missing. Verified against `tsc`: with this shape it
 * errors, the way `ButtonProps` already does.
 *
 * `as` is not decoration, it is the point. The alternative to
 * `<VisuallyHidden as="h2">` is wrapping — `<h2><VisuallyHidden>…</VisuallyHidden></h2>` —
 * which leaves the `<h2>` itself in flow as an empty box with its own margins.
 * `as` puts the hiding on the element that had to exist anyway.
 *
 * PASS PHRASING CONTENT to the default `<span>` — text, `<strong>`, `<a>`. A
 * span cannot legally contain flow content (a `<div>`, a `<p>`, a list), and
 * the failure is silent and SSR-only: the HTML parser closes the enclosing
 * `<p>` and REPARENTS the child out of the span, which strips the class with
 * it, so text written to be invisible paints at full width. Measured — client
 * rendering builds the tree through DOM APIs and never sees it, which is what
 * lets this reach production. Use `as="div"` for flow content, somewhere a
 * `<div>` is legal.
 *
 * The default is `span` because this component is most often reached for inside
 * a `<p>` or a `<button>`, where a `<div>` is not legal. That is about where
 * the span may GO, not what may go inside it.
 *
 * `as` ALSO ACCEPTS A COMPONENT, and one that does not forward `className` to a
 * DOM node silently un-hides its content. Nothing catches that: the guard reads
 * the rendered node, which is styled or not by then, and axe sees nothing wrong
 * either way.
 */
export type VisuallyHiddenProps<As extends ElementType = 'span'> =
  PolymorphicProps<As>;

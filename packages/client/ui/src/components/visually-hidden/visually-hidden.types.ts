import type { ElementType, ReactNode } from 'react';
import type { PolymorphicProps } from '../../primitives/polymorphic.js';

interface VisuallyHiddenOwnProps {
  /**
   * The content to expose to assistive tech while hiding it from sight.
   *
   * PHRASING CONTENT — text, `<strong>`, `<a>`. The default `<span>` cannot
   * legally contain flow content (a `<div>`, a `<p>`, a list), and the failure
   * is silent and only in SSR: the HTML parser closes the enclosing `<p>` and
   * REPARENTS the child out of the span, which strips the class with it, so
   * text written to be invisible is painted at full width. Measured — client
   * rendering builds the tree through DOM APIs and is unaffected, which is
   * exactly what lets this reach production. Pass `as="div"` when the content
   * is flow, and put it somewhere a `<div>` is legal.
   */
  children?: ReactNode;
}

/**
 * Public VisuallyHidden props — polymorphic via `as`, default `span`.
 *
 * `as` is not decoration here, it is the point. The alternative to
 * `<VisuallyHidden as="h2">` is wrapping — `<h2><VisuallyHidden>…</VisuallyHidden></h2>` —
 * which leaves the `<h2>` itself in flow as an empty box with its own margins.
 * `as` puts the hiding on the element that had to exist anyway.
 *
 * The default is `span` because this component is most often reached for inside
 * a `<p>` or a `<button>`, where a `<div>` is not legal. That is a statement
 * about the SPAN's placement, not about what may go inside it — see `children`.
 *
 * `as` ALSO ACCEPTS A COMPONENT, and one that does not forward `className` to a
 * DOM node silently un-hides its content. Nothing catches that: the guard reads
 * the rendered node, which is styled or not by then, and axe sees nothing wrong
 * either way.
 */
export type VisuallyHiddenProps<As extends ElementType = 'span'> =
  PolymorphicProps<As, VisuallyHiddenOwnProps>;

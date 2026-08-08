import type { ElementType, ReactNode } from 'react';
import type { PolymorphicProps } from '../../primitives/polymorphic.js';

interface VisuallyHiddenOwnProps {
  /** The content to expose to assistive tech while hiding it from sight. */
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
 * The default is `span` rather than `div` because a span is valid everywhere,
 * including inside a `<p>` or a `<button>`, which is where this component is
 * most often reached for.
 */
export type VisuallyHiddenProps<As extends ElementType = 'span'> =
  PolymorphicProps<As, VisuallyHiddenOwnProps>;

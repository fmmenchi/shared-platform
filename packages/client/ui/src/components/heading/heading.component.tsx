import { cn } from '../../util/cn.js';
import { headingVariants } from './heading.variants.js';
import { useOverrulingWarning, withoutOverruling } from './heading.guards.js';
import type { HeadingProps } from './heading.types.js';

/**
 * A section's heading: what it IS and how big it LOOKS, said separately.
 *
 * `level` is the tag and the document's outline — the thing assistive tech
 * navigates by. `size` is only the visual step. In raw markup those are one
 * decision and the visual usually wins it: an `<h2>` that had to look smaller
 * became an `<h4>`, and every screen reader user inherited an outline that
 * describes the design rather than the page. Splitting them is the only reason
 * to wrap an element the platform already has.
 *
 * `size` is omitted almost always — it defaults to the level's own look.
 */
function Heading(props: HeadingProps) {
  const { className, level, size, children, ...rest } = props;
  // `role` is refused by the type; `aria-level` cannot be (a type cannot see a
  // JSX attribute name that is not an identifier), so the strip is its only
  // guarantee — and the strip covers the spread and the casing React normalises.
  useOverrulingWarning(rest);
  const safe = withoutOverruling(rest);

  // `as const` is load-bearing: without it the template literal widens to
  // `string` and takes the props with it. WITH it the union survives, JSX
  // typechecks the tag and the attributes, and — measured — the React Compiler
  // memoizes this component. It does not memoize a function containing no JSX,
  // which is how the `createElement` version this replaced became the only
  // unmemoized component in the package while every gate stayed green.
  const Tag = `h${level}` as const;

  return (
    <Tag
      {...safe}
      className={cn(headingVariants({ size: size ?? Tag }), className)}
    >
      {children}
    </Tag>
  );
}

export { Heading };

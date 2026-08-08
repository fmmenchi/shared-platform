import { createElement } from 'react';
import { cn } from '../../util/cn.js';
import { headingVariants } from './heading.variants.js';
import { SIZE_FOR_LEVEL } from './heading.variants.js';
import type { HeadingProps } from './heading.types.js';

/**
 * A section's heading: what it IS and how big it LOOKS, said separately.
 *
 * `level` is the tag and the document's outline — the thing assistive tech
 * navigates by. `size` is only the type scale step. In raw markup those are one
 * decision, and the visual usually wins it: an `<h2>` that had to look smaller
 * became an `<h4>`, and every screen reader user inherited an outline that
 * describes the design rather than the page. Splitting them is the only reason
 * to wrap an element the platform already has.
 *
 * `size` is omitted almost always: each level already renders at the step that
 * belongs to it.
 */
function Heading(props: HeadingProps) {
  const { className, level, size, children, ...rest } = props;

  // `createElement`, not a `Tag` variable: the union of six tags stays a union
  // for TypeScript, where `const Tag = \`h${level}\`` widens to `string` and
  // takes the props with it.
  return createElement(
    `h${level}`,
    {
      ...rest,
      className: cn(
        headingVariants({ size: size ?? SIZE_FOR_LEVEL[level] }),
        className,
      ),
    },
    children,
  );
}

export { Heading };

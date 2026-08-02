import { useEffect, useId, type ElementType } from 'react';
import { cn } from '../util/cn.js';
import type { SurfaceHeadingProps } from './surface-heading.types.js';

/**
 * The heading that NAMES a surface — a Dialog's, a Popover's — by registering
 * its own id as that surface's `aria-labelledby`.
 *
 * It exists as a primitive because the two were the same file: same effect,
 * same generated id, same element, differing by one Tailwind class in a
 * stylesheet next door. A whole folder, a build entry and two package exports
 * apiece to change `text-lg` to `text-base`.
 *
 * The id is OWNED here, never taken from props: the surface points at it, so a
 * caller's id would cut that reference. The registration returns its own
 * removal, so a heading that unmounts takes back exactly what it announced —
 * measured on the Dialog, clearing the slot unconditionally left a surface
 * nameless with a second heading still on screen.
 */
function SurfaceHeading(props: SurfaceHeadingProps) {
  const { as, register, className, children, ...rest } = props;
  const Component = (as ?? 'h2') as ElementType;
  const id = useId();

  useEffect(() => register?.(id), [register, id]);

  return (
    <Component {...rest} id={id} className={cn(className)}>
      {children}
    </Component>
  );
}

export { SurfaceHeading };

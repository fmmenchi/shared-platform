import { useEffect, useId } from 'react';
import { cn } from '../../util/cn.js';
import { usePopoverPart } from '../popover/popover.context.js';
import type { PopoverHeadingProps } from './popover-heading.types.js';
import styles from './popover-heading.module.css';

/**
 * Names the popover. It registers its own id as the surface's
 * `aria-labelledby`, which is the whole reason it is a part rather than any
 * heading you happen to put inside: a `role="dialog"` with no accessible name is
 * announced as "dialog" and nothing else.
 *
 * `h2` by default, and `as` because only the page knows what level follows the
 * heading above it. The `id` is owned by the part, so the reference can never
 * dangle — one passed here is ignored.
 */
function PopoverHeading(props: PopoverHeadingProps) {
  const { as, className, children, ...rest } = props;
  const Component = as ?? 'h2';
  const popover = usePopoverPart('PopoverHeading');
  const id = useId();

  const register = popover?.setHeadingId;
  useEffect(() => {
    if (!register) return;
    register(id);
    return () => register(undefined);
  }, [register, id]);

  return (
    <Component {...rest} id={id} className={cn(styles.heading, className)}>
      {children}
    </Component>
  );
}

export { PopoverHeading };

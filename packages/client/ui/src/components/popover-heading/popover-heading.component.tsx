import { SurfaceHeading } from '../../primitives/surface-heading.js';
import { usePopoverPart } from '../popover/popover.context.js';
import type { PopoverHeadingProps } from './popover-heading.types.js';
import styles from './popover-heading.module.css';

/**
 * Names the popover: it registers its own id as the surface's `aria-labelledby`,
 * which is the whole reason it is a part rather than any heading you happen to
 * put inside. An `h2` by default, because only the page knows what level
 * follows the heading above it.
 */
function PopoverHeading(props: PopoverHeadingProps) {
  const popover = usePopoverPart('PopoverHeading');

  return (
    <SurfaceHeading
      {...props}
      register={popover?.registerHeading}
      className={[styles.heading, props.className].filter(Boolean).join(' ')}
    />
  );
}

export { PopoverHeading };

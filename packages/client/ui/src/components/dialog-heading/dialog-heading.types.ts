import type { SurfaceHeadingProps } from '../../primitives/surface-heading.types.js';

/**
 * A heading, at the level the page needs. `as` takes the six heading tags and
 * nothing else: this element NAMES the dialog through `aria-labelledby`, and a
 * dialog announced as "dialog" and nothing else is the commonest failure of the
 * pattern.
 */
export type DialogHeadingProps = Omit<SurfaceHeadingProps, 'register'>;

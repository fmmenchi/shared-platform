import type { SurfaceHeadingProps } from '../../primitives/surface-heading.types.js';

/**
 * A heading, at the level the page needs. `as` takes the five other heading
 * tags and nothing else: this element NAMES a `role="dialog"` through
 * `aria-labelledby`, and pointing that at a `<div>` — or, as an unconstrained
 * `ElementType` allowed, at an `<input>` — is a name no screen reader reads.
 */
export type PopoverHeadingProps = Omit<SurfaceHeadingProps, 'register'>;

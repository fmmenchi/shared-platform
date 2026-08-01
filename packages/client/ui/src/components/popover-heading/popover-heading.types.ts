import type { ComponentPropsWithRef, ElementType } from 'react';

/**
 * A heading, at the level the page needs. `as` takes the five other heading
 * tags and nothing else: this element NAMES a `role="dialog"` through
 * `aria-labelledby`, and pointing that at a `<div>` — or, as an unconstrained
 * `ElementType` allowed, at an `<input>` — is a name no screen reader reads.
 */
export type PopoverHeadingProps = ComponentPropsWithRef<'h2'> & {
  /** Render as this heading level instead of `h2`. */
  as?: Extract<ElementType, 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'>;
};

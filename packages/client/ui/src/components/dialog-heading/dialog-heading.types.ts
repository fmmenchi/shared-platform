import type { ComponentPropsWithRef, ElementType } from 'react';

/**
 * A heading, at the level the page needs. `as` takes the six heading tags and
 * nothing else: this element NAMES the dialog through `aria-labelledby`, and a
 * dialog announced as "dialog" and nothing else is the commonest failure of the
 * pattern.
 */
export type DialogHeadingProps = ComponentPropsWithRef<'h2'> & {
  /** Render as this heading level instead of `h2`. */
  as?: Extract<ElementType, 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'>;
};

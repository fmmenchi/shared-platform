import type { ElementType } from 'react';
import type { ButtonProps } from '../button/button.types.js';

/**
 * A `Button`'s props, and an `as` for anything that accepts them and ends in a
 * `<button>` — which is what `commandfor` requires. Concrete rather than
 * generic: a generic default resolves through the `ElementType` constraint and
 * degrades the whole prop bag to a string index signature.
 */
export type DialogTriggerProps = Omit<ButtonProps<'button'>, 'as'> & {
  /** Render as this instead — anything that accepts a Button's props. */
  as?: ElementType<ButtonProps<'button'>>;
};

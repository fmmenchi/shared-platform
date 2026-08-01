import type { ElementType } from 'react';
import type { ButtonProps } from '../button/button.types.js';

/**
 * The same props as `DialogTrigger`: a `Button`'s, plus an `as` for anything
 * that accepts them and ends in a `<button>`.
 */
export type DialogCloseProps = Omit<ButtonProps<'button'>, 'as'> & {
  /** Render as this instead — anything that accepts a Button's props. */
  as?: ElementType<ButtonProps<'button'>>;
};

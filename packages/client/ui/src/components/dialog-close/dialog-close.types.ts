import type { ElementType } from 'react';
import type { ButtonProps } from '../button/button.types.js';

/** Same shape as `DialogTriggerProps`: it ends in a `<button>` too. */
export type DialogCloseProps = Omit<ButtonProps<'button'>, 'as'> & {
  /** Render as this instead — anything that accepts a Button's props. */
  as?: ElementType<ButtonProps<'button'>>;
};

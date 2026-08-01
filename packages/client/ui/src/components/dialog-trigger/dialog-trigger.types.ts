import type { ElementType } from 'react';
import type { ButtonProps } from '../button/button.types.js';

/**
 * What opens the dialog: a `Button`'s props, so `variant` and the rest work as
 * they always do — plus an `as` for your own component, as long as it ends in a
 * `<button>`. The platform's `commandfor` works on nothing else.
 */
export type DialogTriggerProps = Omit<ButtonProps<'button'>, 'as'> & {
  /** Render as this instead — anything that accepts a Button's props. */
  as?: ElementType<ButtonProps<'button'>>;
};

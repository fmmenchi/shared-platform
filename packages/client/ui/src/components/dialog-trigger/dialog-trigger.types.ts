import type { ButtonLikeProps } from '../../primitives/button-like.types.js';

/**
 * What opens the dialog: a `Button`'s props, so `variant` and the rest work as
 * they always do — plus an `as` for your own component, as long as it ends in a
 * `<button>`. The platform's `commandfor` works on nothing else.
 */
export type DialogTriggerProps = ButtonLikeProps;

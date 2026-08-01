import type { ElementType } from 'react';
import type { ButtonProps } from '../button/button.types.js';

/**
 * The props of the DS `Button`, because that is what a trigger is — plus an
 * `as` for a component that takes the same props and, in the end, renders a
 * `<button>`. Deliberately the CONCRETE `ButtonProps<'button'>`, not
 * `ComponentPropsWithRef<typeof Button>` nor a generic default of `typeof Button`: measured, both resolve through the `ElementType`
 * constraint and degrade the whole prop bag to a string index signature, so
 * `<PopoverTrigger nosuchprop onClick={42} as="a" href="/x">` compiled without
 * a word. The platform is the reason the narrowness is right rather than
 * merely safe: `popovertarget` works on a `<button>` and on nothing else.
 */
export type PopoverTriggerProps = Omit<ButtonProps<'button'>, 'as'> & {
  /**
   * Render as this instead — anything that accepts a Button's props. Button's
   * own `as` is omitted above rather than merged: two `as` props intersect to
   * something nothing satisfies, and this one has the narrower job.
   */
  as?: ElementType<ButtonProps<'button'>>;
};

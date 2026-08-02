import type { ElementType } from 'react';
import type { ButtonProps } from '../components/button/button.types.js';

/**
 * The props of a part that MUST end in a `<button>` — a Dialog's trigger, a
 * Popover's close, and whatever else the platform's attributes refuse to work
 * on anywhere else.
 *
 * Concrete, and that is the whole point of the type existing at all: neither
 * `ComponentPropsWithRef<typeof Button>` nor a generic with a `typeof Button`
 * default survives contact with `ElementType`. Measured, both resolve through
 * that constraint and degrade the prop bag to a string index signature, so
 * `<Trigger nosuchprop onClick={42} as="a" href="/x">` compiled without a word.
 * Button's own `as` is omitted before the intersection, because two `as` props
 * intersect to something nothing satisfies.
 */
export type ButtonLikeProps = Omit<ButtonProps<'button'>, 'as'> & {
  /** Render as this instead — anything that accepts a Button's props. */
  as?: ElementType<ButtonProps<'button'>>;
};

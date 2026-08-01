import type { ElementType } from 'react';
import { usePopoverPart } from '../popover/popover.context.js';
import { Button } from '../button/button.component.js';
import type { PopoverCloseProps } from './popover-close.types.js';

/**
 * Closes the popover from inside it — declaratively, like the trigger:
 * `popovertargetaction="hide"`, no handler, and the focus goes back to the
 * trigger because the platform puts it back (measured).
 *
 * It earns its place for one reason: the surface's id is generated and internal,
 * so without this part there is no way to write that attribute yourself.
 */
// The prop type is CONCRETE — `Omit<ButtonProps<'button'>, 'as'>` — and not
// `ComponentPropsWithRef<typeof Button>`, nor a generic with a `typeof Button`
// default. Measured, both of those resolve through the `ElementType` constraint
// and degrade the whole bag to a string index signature, so
// `<Trigger nosuchprop onClick={42} as="a" href="/x">` compiled without a word.
// Button's own `as` is omitted before the intersection: two `as` props intersect
// to something nothing satisfies.
function PopoverClose(props: PopoverCloseProps) {
  const { as, ...rest } = props;
  // Cast at the render site, not in the prop type: `as` is CONSTRAINED to
  // something that takes a Button's props, which is what makes the contract
  // strict, and a constrained `ElementType` is not directly callable in JSX.
  const Component = (as ?? Button) as ElementType;
  const popover = usePopoverPart('PopoverClose');

  return (
    <Component
      type="button"
      {...rest}
      popoverTarget={popover?.surfaceId}
      popoverTargetAction="hide"
    />
  );
}

export { PopoverClose };

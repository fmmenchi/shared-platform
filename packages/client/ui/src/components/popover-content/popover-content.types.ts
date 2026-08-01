import type { ComponentPropsWithRef } from 'react';

/**
 * The surface. A plain `<div>` in the props sense — everything it is given goes
 * to the element — with the popover wiring added: the id the trigger targets,
 * `popover="auto"`, `role="dialog"`, and the name its heading gives it.
 */
export type PopoverContentProps = ComponentPropsWithRef<'div'>;

import type { ComponentPropsWithRef } from 'react';

/**
 * The surface. A native `<dialog>` in the props sense — everything it is given
 * goes to the element — with the popover wiring added: the id the trigger
 * targets, `popover="auto"`, and the name its heading gives it.
 */
export type PopoverContentProps = ComponentPropsWithRef<'dialog'>;

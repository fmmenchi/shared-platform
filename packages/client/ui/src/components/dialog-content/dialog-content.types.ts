import type { ComponentPropsWithRef } from 'react';

/**
 * The dialog itself. A native `<dialog>` in the props sense — everything it is
 * given goes to the element — with the wiring added: the id its trigger
 * commands, the name its heading gives it, and `closedby="any"` so a click on
 * the backdrop dismisses it.
 */
export type DialogContentProps = ComponentPropsWithRef<'dialog'>;

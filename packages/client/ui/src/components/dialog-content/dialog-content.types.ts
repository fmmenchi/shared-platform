import type { ComponentPropsWithRef } from 'react';

/**
 * The dialog itself: a native `<dialog>`, and what it is given goes to the
 * element — including `closedby`, so a modal holding unfinished work can ask
 * for `closerequest` and refuse a stray backdrop click.
 *
 * The `id` is the exception, and it is owned by the component: the trigger's
 * `commandfor` points at it, so one passed here would cut that wire. It is
 * ignored.
 */
export type DialogContentProps = ComponentPropsWithRef<'dialog'>;

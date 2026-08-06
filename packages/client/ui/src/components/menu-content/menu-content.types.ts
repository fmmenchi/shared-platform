import type { ComponentPropsWithRef } from 'react';

/**
 * The menu surface. A `<div role="menu">` in the top layer, anchored to the
 * trigger — everything it is given goes to the element, except the id, which
 * the trigger targets.
 */
export type MenuContentProps = ComponentPropsWithRef<'div'>;

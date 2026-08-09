import type { ReactNode, Ref } from 'react';

/**
 * What a `Slot` receives: one element to render, and the props to put on it.
 *
 * The index signature is deliberate and is not a hole in the type: the CALLER
 * here is a design-system component handing over its own props, never an app.
 * What an app writes is the child, and that is checked by the child's own
 * types — which is the entire point of doing this instead of a generic.
 */
export interface SlotProps extends Record<string, unknown> {
  /** Exactly one element. Anything else is rendered untouched, with a warning. */
  children?: ReactNode;
  ref?: Ref<unknown>;
}

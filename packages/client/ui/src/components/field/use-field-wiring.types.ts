import type { RefObject } from 'react';
import type { Describable } from '../../primitives/describable.types.js';
import type { FieldContextValue } from './field.context.js';

/** What a field container gets from `useFieldWiring` to render itself. */
export interface FieldWiring<E extends HTMLElement> {
  /** Provide as `FieldContext` — the id, invalid state and describedby ids. */
  field: FieldContextValue;
  /** Provide as `DescribableContext` — where description/error parts register. */
  describable: Describable;
  /** Attach to the container: the dev-only label check measures the DOM. */
  ref: RefObject<E | null>;
}

import { useEffect, type RefObject } from 'react';
import type { NativePropertyOptions } from './use-native-property.types.js';

/**
 * Keep a DOM PROPERTY in step with a prop — the machinery React ships for
 * `value` and `checked`, for the properties it does not ship it for.
 *
 * There is no difference in kind between `input.value` and `input.indeterminate`:
 * both are properties, not attributes, and both need someone to write them.
 * React special-cases the first two (`restoreControlledState`) and never
 * mentions the third — verified against `react-dom` 19.2.8, which contains zero
 * references to `indeterminate`. This hook is that missing half.
 *
 * The caller chooses the mode, per instance:
 *
 * - **driven** — pass `value`. It is written on every change, so the state can
 *   arrive late (a fetch) or be set programmatically at any time.
 * - **not driven** — pass `initial` instead. It is written once and the element
 *   owns it from then on, which is what "uncontrolled" means.
 *
 * Driving is a PUSH, not a mirror: the value is written when it CHANGES. If the
 * user edits the element and the caller then re-supplies the value it already
 * had, nothing is written and the user's edit stands. Mirroring instead would
 * mean writing on every render, which is not reliable here — the React Compiler
 * may skip re-rendering a component whose props did not change (measured).
 *
 * A property the browser CLEARS as a side effect of an event has to be written
 * again by whoever knows that — this hook deliberately does not take an event
 * name for it. That is one component's quirk (`Checkbox`'s `indeterminate`),
 * not a general concept, and a knob with one user does not belong in a shared
 * API.
 */
export function useNativeProperty<V>(
  ref: RefObject<HTMLElement | null>,
  property: string,
  options: NativePropertyOptions<V>,
): void {
  const { value, initial } = options;

  useEffect(() => {
    const node = ref.current;
    if (node == null) return;

    if (value === undefined) {
      // Not driven: a starting value, then hands off. Writing anything later —
      // including a default of `false` — would stomp on an element the caller
      // may be driving imperatively through its own ref.
      if (initial !== undefined) Reflect.set(node, property, initial);
      return;
    }

    Reflect.set(node, property, value);
  }, [ref, property, value, initial]);
}

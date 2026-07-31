import { useEffect, useRef, type RefObject } from 'react';
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
/**
 * Write the property, optionally announcing it.
 *
 * Through the PROTOTYPE's setter, not the element's own. React installs a value
 * tracker on the instance and compares against it to decide whether an event is
 * a real change; assigning through the instance updates that tracker too, so the
 * event we then dispatch is discarded as a duplicate and `onChange` never fires
 * — the exact reason `ref.current.value = x` looks like it works and does not.
 * Going through the prototype leaves the tracker stale, which is what makes the
 * change look real.
 */
function write(
  node: HTMLElement,
  property: string,
  value: unknown,
  notify: boolean,
): void {
  const setter = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(node),
    property,
  )?.set;
  if (notify && setter !== undefined) setter.call(node, value);
  else Reflect.set(node, property, value);

  if (!notify) return;
  // ONE event, not two. React synthesises `onChange` from both `input` and
  // `change` on a text field, so dispatching the pair calls the handler twice
  // for a single write — measured. `input` is the one that fires first for a
  // real edit, so it is the honest one to imitate.
  node.dispatchEvent(new Event('input', { bubbles: true }));
}

export function useNativeProperty<V>(
  ref: RefObject<HTMLElement | null>,
  property: string,
  options: NativePropertyOptions<V>,
): void {
  const { value, initial, notify } = options;
  // Mounting is not a change: the first pass seeds the element and must not
  // announce one, or every field fires `onChange` on mount and a form is dirty
  // before the user has touched it.
  const mounted = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (node == null) return;

    if (value === undefined) {
      // Not driven: a starting value, then hands off. Writing anything later —
      // including a default of `false` — would stomp on an element the caller
      // may be driving imperatively through its own ref.
      if (initial !== undefined) write(node, property, initial, false);
      mounted.current = true;
      return;
    }

    // Announce every write EXCEPT the very first pass, which is the mount.
    // Going from not-driven to driven — a value arriving from a fetch — is a
    // change and does announce; only seeding the element on mount does not.
    write(node, property, value, notify === true && mounted.current);
    mounted.current = true;
  }, [ref, property, value, initial, notify]);
}

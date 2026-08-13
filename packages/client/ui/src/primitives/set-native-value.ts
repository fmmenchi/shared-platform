/**
 * Write an input's value so that BOTH the DOM and React hear it.
 *
 * `element.value = next` updates the DOM and nothing else: React attaches one
 * delegated listener per root and tracks the value it last saw on the node, so a
 * plain assignment leaves that tracker in step with the new value and the
 * synthetic `change`/`input` never fires. A component whose value is written for
 * it — here, a carrier fed by three fields beside it — would then be invisible to
 * every form library, which is the entire point of having a carrier.
 *
 * The setter on the PROTOTYPE is the one React's tracker does not own, so
 * calling it through leaves the tracker stale; the dispatched `input` then looks
 * exactly like a keystroke, bubbles to the delegated listener, and `onChange`
 * runs. This is the same technique the testing libraries use to type into a
 * React-controlled field, and it is the only one that works on a value no human
 * touched.
 *
 * Returns `false` when the environment has no such descriptor, so a caller can
 * say so rather than silently doing nothing.
 */
export function setNativeValue(
  element: HTMLInputElement,
  next: string,
): boolean {
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  );
  const set = descriptor?.set;
  if (set === undefined) return false;
  set.call(element, next);
  element.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}

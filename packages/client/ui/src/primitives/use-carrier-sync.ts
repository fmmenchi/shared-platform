import { useEffect, useRef } from 'react';

/**
 * Hear every write that reaches a CARRIER — the hidden input a component puts
 * the real value on while the visible box shows something else.
 *
 * A carrier is a one-way street by default: the component pushes the value onto
 * the node and a form library reads it off. The other direction is the one that
 * breaks, because a library does not ask permission — it assigns, or it
 * dispatches, or it calls `form.reset()`, and a component that only pushes
 * never learns. `DateInput` paid for all three separately and documents each as
 * measured; this is that machinery, extracted, so the next carrier inherits it
 * instead of re-deriving it. `Combobox` is that next carrier, and it shipped a
 * first version with the markup and none of this — a `defaultValues` holding a
 * key was wiped on mount, and `form.reset()` moved the DOM while the component
 * went on showing the discarded choice.
 *
 * THE THREE DOORS, and a write takes exactly one of them:
 *
 * 1. **a bare assignment** — `element.value = key`. What a controlled adapter
 *    does (Formik, TanStack, through `useBoundCarrier`) and what react-hook-form
 *    does for `defaultValues` and `setValue`. Seen by wrapping the node's own
 *    `value` descriptor.
 * 2. **an `input` event** — how anything that must defeat React's value tracker
 *    writes, since the only way to leave the tracker stale is the PROTOTYPE
 *    setter, which by definition steps over the property wrapped for door 1.
 *    That includes the component's own writes via `setNativeValue`, which is why
 *    `onArrive` must be a no-op when the value already agrees.
 * 3. **`form.reset()`** — takes neither of the first two. The platform reverts a
 *    control to its default without touching the `value` property and without an
 *    event, so nothing announces it.
 *
 * AND WHATEVER WAS WRITTEN BEFORE ANY OF THEM WERE INSTALLED. `register()`'s ref
 * callback fires in the COMMIT phase, so react-hook-form has already assigned
 * the node by the time this passive effect runs. Reading the node once, here, is
 * the only place that write can still be seen.
 *
 * `onArrive` may be a fresh closure on every render — it is held in a ref and
 * the subscription never re-runs, so a component does not have to memoise the
 * one callback whose whole job is to read current state.
 *
 * `DateInput` IS NOT ON THIS YET, and that is deliberate rather than forgotten:
 * its copy is entangled with the mask — it re-reads a `shown` ref, re-formats
 * the text for the locale and re-announces on the way through — so migrating it
 * is a change to the date family's own behaviour and belongs in its own commit,
 * with the date suites as the evidence. Until then the doors exist twice, and a
 * fix to one is owed to the other.
 *
 * THE NODE, not a ref to it. A carrier is typically rendered only when there is
 * a `name` to submit it under, so it arrives and leaves during the component's
 * life — and an effect keyed on a ref object never re-runs, because a ref's
 * identity is the one thing that never changes. Keyed on the node, a carrier
 * that appears later is subscribed the moment it does.
 */
export function useCarrierSync(
  element: HTMLInputElement | null,
  onArrive: (value: string) => void,
): void {
  const latest = useRef(onArrive);
  // Written in an EFFECT and not in render: the React Compiler refuses a ref
  // write during render, and it is right to — this is bookkeeping, not
  // something the render depends on. Declared BEFORE the subscription below so
  // that it has already run when the mount read fires.
  useEffect(() => {
    latest.current = onArrive;
  }, [onArrive]);

  useEffect(() => {
    if (element === null) return;

    const own = Object.getOwnPropertyDescriptor(element, 'value');
    const proto = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    );
    const set = own?.set ?? proto?.set;
    const get = own?.get ?? proto?.get;
    if (set === undefined || get === undefined) return;

    const arrived = element.value;

    Object.defineProperty(element, 'value', {
      configurable: true,
      enumerable: own?.enumerable ?? false,
      // Bound to the element rather than to `this`: the descriptor is installed
      // on this one node and nowhere else, and the React Compiler refuses a
      // file containing a `this` it cannot follow.
      get() {
        return get.call(element) as string;
      },
      set(next: unknown) {
        set.call(element, next);
        latest.current(String(next));
      },
    });

    const follow = () => {
      latest.current(element.value);
    };
    element.addEventListener('input', follow);

    // READ ON A TASK, NOT A MICROTASK. A microtask checkpoint runs as soon as
    // the listener returns and the JS stack is empty — which it IS when the
    // browser runs the reset from a button's activation behaviour, i.e. the
    // only reset a user can perform. Measured at the platform level on
    // `DateInput`, typing into a seeded field:
    //
    //     button click   listener: typed | microtask: typed | timeout: seed
    //     form.reset()   listener: typed | microtask: seed  | timeout: seed
    //
    // So the microtask version reported the value that had just been DISCARDED.
    //
    // ON THE DOCUMENT, IN THE CAPTURE PHASE, rather than on `element.form`. A
    // listener bound to the form is bound to the form the carrier had WHEN THE
    // EFFECT RAN: the cleanup then reads `element.form` after React has
    // detached the node, gets `null`, and removes nothing — measured, a control
    // unmounted from a surviving form leaked its listener and its whole closure
    // every time. A changed `form=` prop never rebuilt it either. The document
    // is always there, and the filter is the carrier's own membership, read at
    // event time.
    const reset = (event: Event) => {
      if (event.target !== element.form) return;
      setTimeout(() => {
        // A RESET CAN BE REFUSED. `preventDefault()` on the event — a page
        // asking "are you sure?" — cancels the revert, so the carrier still
        // holds what it held and the component should too. Read HERE rather
        // than in the listener: this is capture phase, so the listener runs
        // BEFORE the handler that would refuse, and the flag is only true once
        // the dispatch is over.
        if (event.defaultPrevented) return;
        latest.current(element.value);
      }, 0);
    };
    document.addEventListener('reset', reset, true);

    // LAST, and after the listeners are installed: adopting the mount value can
    // set state, and doing it before the subscription exists would lose a write
    // that lands in the same tick.
    latest.current(arrived);

    return () => {
      element.removeEventListener('input', follow);
      document.removeEventListener('reset', reset, true);
      if (own === undefined) {
        Reflect.deleteProperty(element, 'value');
      } else {
        Object.defineProperty(element, 'value', own);
      }
    };
  }, [element]);
}

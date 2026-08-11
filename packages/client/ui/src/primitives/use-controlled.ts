import { useRef, useState } from 'react';
import { useDevWarning } from './use-dev-warning.js';

interface UseControlledOptions<T> {
  /** Controlled value; `undefined` means uncontrolled. */
  value?: T;
  /** Initial value when uncontrolled. */
  defaultValue?: T;
  /** Called on every change, controlled or uncontrolled. */
  onChange?: (value: T) => void;
  /** Component name, used only in the dev warning. */
  name?: string;
}

/**
 * What to set: a value, or a function of the current one. The second form is
 * React's own, and it is here for the same reason React has it.
 */
export type ControlledUpdater<T> = T | ((previous: T) => T);

/**
 * Controlled/uncontrolled value. Returns the current value and a setter that
 * updates internal state (only when uncontrolled) and always calls `onChange`.
 * Warns in dev if a component flips between controlled and uncontrolled during
 * its lifetime.
 *
 * THE SETTER TAKES AN UPDATER, and that was a correction rather than a
 * convenience. Every caller wrote `setValue(next(current))`, where `current` is
 * the value from the render that produced the closure — so two calls in one
 * tick both computed from the same base and the first one VANISHED. Measured on
 * `useRowSelection`: toggling two rows from a single handler left one selected.
 *
 * Uncontrolled, that is now fixed outright: this hook is the only writer, so the
 * last value it produced is the truth even before React has re-rendered with
 * it, and a ref remembers it. Controlled, the base can only be the value the
 * parent last handed over — if they defer their update, they hold the stale
 * one, not us. That case is theirs to fix with their own functional setter,
 * which is why the components report INTENTS (`onSortToggle(key)`,
 * `onRowSelectToggle(id)`) rather than computed states: it leaves the consumer
 * a position to write `setState((prev) => …)` in.
 *
 * No manual memoization: the React Compiler memoizes `setValue`, and the initial
 * mode is captured with `useState` (readable in render) rather than a ref (which
 * the Rules of React forbid reading during render). The ref below is read and
 * written only from the setter, which runs in an event, never in render.
 */
export function useControlled<T>({
  value,
  defaultValue,
  onChange,
  name = 'component',
}: UseControlledOptions<T>): readonly [
  T,
  (next: ControlledUpdater<T>) => void,
] {
  const isControlled = value !== undefined;
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  // The last value THIS HOOK produced, and the rendered value it was computed
  // from. Both, because "is my shadow still current?" is the only question that
  // makes it safe in the controlled case.
  const pending = useRef<{ from: T; value: T } | null>(null);

  const [initiallyControlled] = useState(isControlled);
  useDevWarning(
    initiallyControlled !== isControlled,
    `useControlled (${name}): switching between controlled and uncontrolled. ` +
      `Pick one for the component's lifetime.`,
  );

  const current = (isControlled ? value : uncontrolled) as T;

  const setValue = (next: ControlledUpdater<T>) => {
    // WHAT WE LAST PRODUCED beats what we last rendered, in BOTH modes — and
    // the first version restricted this to the uncontrolled one, which left the
    // defect alive on the path most of these hooks call primary. Measured on
    // `useFilterState`: two filters applied in one tick, controlled, and the
    // first one silently vanished. The consumer cannot repair it from their
    // side either, because the callback hands them a computed value rather than
    // an updater.
    //
    // Safe in the controlled case because the shadow REMEMBERS WHAT IT CAME
    // FROM: it is only trusted while the rendered value has not moved under it,
    // so a parent that commits a different value invalidates it without any
    // render-phase bookkeeping.
    const base =
      pending.current !== null && Object.is(pending.current.from, current)
        ? pending.current.value
        : current;
    const resolved =
      typeof next === 'function' ? (next as (previous: T) => T)(base) : next;

    pending.current = { from: current, value: resolved };
    if (!isControlled) setUncontrolled(resolved);
    onChange?.(resolved);
  };

  return [current, setValue] as const;
}

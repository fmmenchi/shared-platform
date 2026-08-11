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
  const pending = useRef<{ value: T } | null>(null);

  const [initiallyControlled] = useState(isControlled);
  useDevWarning(
    initiallyControlled !== isControlled,
    `useControlled (${name}): switching between controlled and uncontrolled. ` +
      `Pick one for the component's lifetime.`,
  );

  const current = (isControlled ? value : uncontrolled) as T;

  const setValue = (next: ControlledUpdater<T>) => {
    // Uncontrolled, what we last produced beats what we last rendered. React
    // has not necessarily re-rendered between two calls in the same tick, and
    // `current` is a render value.
    const base =
      !isControlled && pending.current !== null
        ? pending.current.value
        : current;
    const resolved =
      typeof next === 'function' ? (next as (previous: T) => T)(base) : next;

    if (!isControlled) {
      pending.current = { value: resolved };
      setUncontrolled(resolved);
    }
    onChange?.(resolved);
  };

  return [current, setValue] as const;
}

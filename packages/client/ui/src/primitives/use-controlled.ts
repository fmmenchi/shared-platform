import { useCallback, useRef, useState } from 'react';
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
 * Controlled/uncontrolled value. Returns the current value and a stable setter
 * that updates internal state (only when uncontrolled) and always calls
 * `onChange`. Warns in dev if a component flips between controlled and
 * uncontrolled during its lifetime.
 */
export function useControlled<T>({
  value,
  defaultValue,
  onChange,
  name = 'component',
}: UseControlledOptions<T>): readonly [T, (next: T) => void] {
  const isControlled = value !== undefined;
  const [uncontrolled, setUncontrolled] = useState(defaultValue);

  const initiallyControlled = useRef(isControlled);
  useDevWarning(
    initiallyControlled.current !== isControlled,
    `useControlled (${name}): switching between controlled and uncontrolled. ` +
      `Pick one for the component's lifetime.`,
  );

  // Latest onChange without re-creating the setter (avoids stale closures).
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const setValue = useCallback(
    (next: T) => {
      if (!isControlled) setUncontrolled(next);
      onChangeRef.current?.(next);
    },
    [isControlled],
  );

  const current = (isControlled ? value : uncontrolled) as T;
  return [current, setValue] as const;
}

import { createContext, useContext } from 'react';
import { useDevWarning } from './use-dev-warning.js';

/**
 * The context a compound component gives its parts, with the orphan warning
 * that comes with it.
 *
 * Every family in here needs the same three things — a context, a hook that
 * reads it, and a hook that reads it and says WHICH part was misplaced when it
 * is not there — and the Dialog's and the Popover's versions were verbatim
 * copies of each other, name string aside. This is the second consumer, which
 * is when the workspace's own rule says an abstraction has earned its place;
 * the Menu would have been the third.
 *
 * It returns `null` rather than throwing, which is the behaviour the parts
 * rely on: a misplaced part is worth a loud warning, not a crashed page.
 *
 * @example
 * const { Context, usePart } = createPartContext<DialogContextValue>('Dialog');
 */
export function createPartContext<Value>(family: string) {
  const Context = createContext<Value | null>(null);

  /** The context, or `null` outside the family. Silent. */
  const useFamilyContext = (): Value | null => useContext(Context);

  /** The context, warning by name when the part is used outside the family. */
  const usePart = (part: string): Value | null => {
    const value = useContext(Context);
    useDevWarning(
      value == null,
      `${part}: used outside a <${family}>, so it is not wired to anything.`,
    );
    return value;
  };

  return { Context, useFamilyContext, usePart };
}

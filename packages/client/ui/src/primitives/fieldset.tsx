import { createContext, useContext } from 'react';
import { useDevWarning } from './use-dev-warning.js';
import type { DescribedByRegistry } from './describedby-registry.js';

/**
 * Shared state a `Fieldset` provides to its description and error parts: the
 * group's `aria-describedby` registry, and nothing else. The group is named by
 * its native `<legend>`, so — unlike `Field` — there is no id to thread for the
 * label, and no control-side wiring at all: the controls inside stay untouched
 * (ADR-0013).
 */
export type FieldsetContextValue = DescribedByRegistry;

export const FieldsetContext = createContext<FieldsetContextValue | null>(null);

export const useFieldsetContext = (): FieldsetContextValue | null =>
  useContext(FieldsetContext);

/**
 * Context for a `Fieldset` PART, warning (with the part's own name) when it is
 * used outside one. Every part reads the context through this instead of
 * `useFieldsetContext`, so an orphan part can't fail silently — a stray
 * description that registers nowhere is invisible otherwise. It returns `null`
 * rather than throwing: a misplaced label is worth a loud warning, not a crashed
 * page.
 */
export function useFieldsetPart(part: string): FieldsetContextValue | null {
  const fieldset = useFieldsetContext();
  useDevWarning(
    fieldset == null,
    `${part}: used outside a <Fieldset>, so it is not wired to any group.`,
  );
  return fieldset;
}

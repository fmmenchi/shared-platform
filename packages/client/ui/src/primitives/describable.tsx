import { createContext, useContext } from 'react';
import { useDevWarning } from './use-dev-warning.js';
import type { Describable, DescribableOwner } from './describable.types.js';

/**
 * The slot a describable container fills for its text parts. It is deliberately
 * the ONLY thing shared between `Field` and `Fieldset`: a part reads this and
 * binds to whichever of the two is nearest, so the pair of description/error
 * components does not have to be duplicated per container.
 */
export const DescribableContext = createContext<Describable | null>(null);

export const useDescribableContext = (): Describable | null =>
  useContext(DescribableContext);

/**
 * Context for a text part, warning (with the part's own name) when it sits in no
 * describable container — a stray description renders perfectly and describes
 * nothing, which is invisible otherwise. Pass `only` for a part that fits a single
 * container (a `<legend>` names a group, never a field). Returns `null` rather
 * than throwing: a misplaced part is worth a loud warning, not a crashed page.
 */
export function useDescribable(
  part: string,
  only?: DescribableOwner,
): Describable | null {
  const describable = useDescribableContext();
  const misplaced =
    describable == null || (only != null && describable.owner !== only);
  useDevWarning(
    misplaced,
    `${part}: used outside a <${only ?? 'Field'}>${
      only == null ? ' or <Fieldset>' : ''
    }, so it is not wired to anything.`,
  );
  return misplaced ? null : describable;
}

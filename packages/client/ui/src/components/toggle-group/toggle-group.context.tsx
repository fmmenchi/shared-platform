import { createContext, useContext } from 'react';
import { useDevWarning } from '../../primitives/use-dev-warning.js';

/**
 * What a `ToggleGroup` provides to its items.
 *
 * IT CARRIES THE VALUE, which the archetype tells a family not to do — and the
 * exception is the whole point of this component. The rule protects a part that
 * is a control in its own right (ADR-0013): a `Checkbox` inside a `Field` owns
 * its own `checked`, so a context reaching in would be a second holder. Here
 * the group IS the control. One value belongs to the set, the radios pair by a
 * `name` only the group knows, and an item that owned its own `checked` would
 * be able to disagree with its siblings — which is the state a radio group
 * exists to make unspeakable.
 */
export interface ToggleGroupContextValue {
  /** The shared `name`: what pairs the radios, and what a form submits under. */
  name: string;
  /** The selected value while the group is CONTROLLED. */
  value: string | undefined;
  /** The value selected at mount while it is not. */
  defaultValue: string | undefined;
  /**
   * Controlled or not, stated rather than inferred: an item cannot tell the
   * two apart from `value` alone, and picking `checked` when it should have
   * picked `defaultChecked` is what takes `form.reset()` away.
   */
  controlled: boolean;
  /** Told by an item when the platform selects it. */
  select: (value: string) => void;
}

export const ToggleGroupContext = createContext<ToggleGroupContextValue | null>(
  null,
);

export const useToggleGroupContext = (): ToggleGroupContextValue | null =>
  useContext(ToggleGroupContext);

/**
 * Context for a `ToggleGroup` PART, warning (with the part's own name) when it
 * is used outside one. It returns `null` rather than throwing: a misplaced part
 * is worth a loud warning, not a crashed page.
 */
export function useToggleGroupPart(
  part: string,
): ToggleGroupContextValue | null {
  const context = useToggleGroupContext();
  useDevWarning(
    context == null,
    `${part}: used outside a <ToggleGroup>, so it is not wired to anything — it has no name to pair by and submits nothing.`,
  );
  return context;
}

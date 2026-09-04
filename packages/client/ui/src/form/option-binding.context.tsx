import { createContext, useContext } from 'react';
import type { ControlPropsByTag } from './form-adapter.types.js';

/**
 * A field's binding, reaching the OPTIONS that draw it.
 *
 * The bound wrapper (`FormSegmentedControl`) calls the port once for the field;
 * each option then asks this for its own props. Opt-in and null when absent,
 * exactly like `useFieldControl`: outside a bound wrapper an option is drawn by
 * the unbound component as it always was, and nothing here changes what a
 * consumer wrote.
 *
 * WHY A SECOND CONTEXT rather than a prop on the unbound component: the group
 * (`SegmentedControl`) knows nothing about forms and should keep knowing
 * nothing — a `option` prop on it would put a binding concept in the public API
 * of a component that has no business with one. The wrapper owns the binding,
 * so the wrapper provides it.
 */
export interface OptionBinding {
  /** The bound props for the option with this value — see `UseFormOptionField`. */
  option: (value: string) => ControlPropsByTag['input'];
  /**
   * The field's whole value, for a set whose controls come and go — see
   * `BoundOptionField.setValues`, of which this is the same member reaching the
   * component that draws them. Optional here for the same reason it is
   * optional there: an adapter whose library reads the document has nothing to
   * update.
   */
  setValues?: (values: readonly string[]) => void;
  /** What the field already holds — see `BoundOptionField.values`. */
  values?: readonly string[];
}

const OptionBindingContext = createContext<OptionBinding | null>(null);

export const OptionBindingProvider = OptionBindingContext.Provider;

/** The binding in scope, or `null` where the group is not bound. */
export function useOptionBinding(): OptionBinding | null {
  return useContext(OptionBindingContext);
}

import type { FieldControlProps } from './field.context.js';

/** Props a raw `<label>` needs to point at the field's control. */
export interface FieldLabelSlotProps {
  htmlFor: string | undefined;
}

/**
 * Prop getters for wiring a control the design system does not own. Getters, not
 * plain collections: each one MERGES what you pass in, so your own props and the
 * field's wiring compose instead of one clobbering the other.
 */
export interface UseFieldResult {
  /** `true` when there is a `Field` above; the getters are pass-throughs when not. */
  isInsideField: boolean;
  /** Props for the control: the field's `id`, `aria-describedby`, `aria-invalid`. */
  getControlProps: <P extends object>(props?: P) => P & FieldControlProps;
  /** Props for a raw `<label>`: the `htmlFor` that targets the control. */
  getLabelProps: <P extends object>(props?: P) => P & FieldLabelSlotProps;
}

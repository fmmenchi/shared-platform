import { useEffect } from 'react';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import {
  applyFieldProps,
  useFieldContext,
  type FieldControlProps,
} from './field.context.js';
import type { FieldLabelSlotProps, UseFieldResult } from './use-field.types.js';

/**
 * Wire a control the design system does not own — a raw `<input>`, a third-party
 * date picker, a masked input — into the surrounding `Field`.
 *
 * The DS's own controls pick the wiring up from context by themselves; anything
 * else cannot, and this is the escape hatch. It hands back prop GETTERS rather
 * than a props object so your own props merge with the field's instead of one
 * overwriting the other, and so a control that needs none of them can take just
 * the label side.
 *
 * @example
 * const { getLabelProps, getControlProps } = useField();
 * return (
 *   <>
 *     <label {...getLabelProps()}>Born on</label>
 *     <ThirdPartyDatePicker {...getControlProps({ locale })} />
 *   </>
 * );
 */
export function useField(): UseFieldResult {
  const field = useFieldContext();

  // One `useField` stands for one control, so register its presence the way a DS
  // control does — that keeps the Field's "more than one control" guard honest.
  const registerControl = field?.registerControl;
  useEffect(() => registerControl?.(), [registerControl]);

  // Unlike the internal hook, which is a silent no-op so a control works standalone,
  // this one is called BECAUSE the caller believes they are inside a Field. Say so
  // when they are not: the alternative is wiring that quietly does nothing.
  useDevWarning(
    field == null,
    'useField: called outside a <Field>, so the returned props wire nothing.',
  );

  return {
    isInsideField: field != null,
    getControlProps: <P extends object>(props?: P): P & FieldControlProps =>
      applyFieldProps(field, (props ?? ({} as P)) as P),
    getLabelProps: <P extends object>(props?: P): P & FieldLabelSlotProps => ({
      ...((props ?? {}) as P),
      htmlFor: field?.controlId,
    }),
  };
}

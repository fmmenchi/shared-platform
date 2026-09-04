import { useField } from 'formik';
import type { UseFormOptionField } from '@fmmenchi/ui';
import {
  checkedInGroup,
  isMultipleField,
  isOptionChecked,
} from '../field-type.js';
import type { FormFieldTypeOptions } from '../field-type.types.js';

/**
 * `@fmmenchi/ui`'s option-field port, implemented for Formik — one field drawn
 * as many controls.
 *
 * ONE `useField` CALL, NOT ONE PER OPTION, and this is the rule the shape was
 * designed around. Formik's own idiom for a radio is
 * `useField({ name, type: 'radio', value })`, which would be a hook per option:
 * legal only while the option count never changes, and the count is data — a
 * filtered list, an async one, a combobox's chips. So the field is read once and
 * `checked` is computed here instead, which is the same answer Formik would
 * have given and does not make the number of hooks depend on the data.
 *
 * `field.onChange` is Formik's `handleChange`, and it already knows both shapes:
 * for a radio it stores `target.value`; for a checkbox whose stored value is an
 * array it adds and removes.
 *
 * WHY THE MULTIPLE BRANCH EXISTS ANYWAY — corrected, because the first version
 * of this comment gave a reason that is not true. It claimed Formik would store
 * the boolean `true` on the first click of an untouched group; it does not.
 * `getValueForCheckbox` returns a boolean only when the current value already
 * is one, or when the input carries no meaningful `value` — with `undefined`
 * held and `'news'` on the box it falls through to `concat` and yields
 * `['news']`, which is right. The real reason is ORDER: left to itself Formik
 * appends in the order the reader ticks, and the three uncontrolled bindings
 * answer in document order, so one port would give two answers. See
 * `checkedInGroup`.
 */
/** The stored value as a list of keys, or `undefined` when it is not one. */
function asKeys(stored: unknown): readonly string[] | undefined {
  return Array.isArray(stored) && stored.every((one) => typeof one === 'string')
    ? (stored as readonly string[])
    : undefined;
}

export function createFormikOptionField(
  options: FormFieldTypeOptions = {},
): UseFormOptionField {
  const { types = {} } = options;

  return function useFormikOptionField(name) {
    const multiple = isMultipleField(types[name]);
    const [field, meta, helpers] = useField(name);
    const stored = field.value;

    return {
      option: (value) => ({
        name,
        value,
        checked: isOptionChecked(stored, value, multiple),
        onChange: multiple
          ? (event) => {
              void helpers.setValue(
                checkedInGroup(event.target, name, stored, value),
              );
            }
          : field.onChange,
        onBlur: field.onBlur,
      }),
      // WHAT IT HOLDS, for a control that has to draw a set before anything is
      // picked — the reader that matches the writer below.
      values: asKeys(stored),
      // THE WHOLE LIST — see the port's own note. A carrier that unmounts sends
      // nothing, and this library keeps a store, so it has to be told rather
      // than left to infer. The same helper the checkbox branch above uses, and
      // the order arrives already decided by the caller.
      setValues: (values) => {
        void helpers.setValue([...values]);
      },
      // Gated on `touched`, exactly as the per-field binding is: the two must
      // agree about when a form starts speaking, or a group shouts while the
      // input beside it stays quiet.
      errors: meta.touched && meta.error ? [meta.error] : [],
    };
  };
}

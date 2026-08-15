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
 * array it adds and removes. The multiple branch below therefore only exists for
 * the case Formik cannot see — a group whose value is not an array YET, which is
 * every group before the first tick and after a `resetForm`. Left to Formik that
 * first click stores the boolean `true` in place of the list.
 */
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
      // Gated on `touched`, exactly as the per-field binding is: the two must
      // agree about when a form starts speaking, or a group shouts while the
      // input beside it stays quiet.
      errors: meta.touched && meta.error ? [meta.error] : [],
    };
  };
}

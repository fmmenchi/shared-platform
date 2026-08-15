import type { AnyFieldApi, AnyFormApi } from '@tanstack/react-form';
import { useField, useSelector } from '@tanstack/react-form';
import type { UseFormOptionField } from '@fmmenchi/ui';
import {
  checkedInGroup,
  isMultipleField,
  isOptionChecked,
} from '../field-type.js';
import type { FormFieldTypeOptions } from '../field-type.types.js';
import { toMessages } from './tanstack-messages.js';

/**
 * `@fmmenchi/ui`'s option-field port, implemented for TanStack Form — one field
 * drawn as many controls.
 *
 * `useField` MOUNTS the field, and TanStack tracks per-field state only for
 * mounted fields — the same reason the per-field binding goes through it rather
 * than reading the store. Reading the store instead looks like it works and then
 * the form can never be submitted again, because the stale per-field errors are
 * never reconciled.
 *
 * Mounted ONCE for the group, not once per option: a hook per option would tie
 * the number of hooks to the number of options, and TanStack would be mounting
 * and unmounting a field per render as a filtered list changes length.
 *
 * TanStack is fully controlled, so both branches are written out here — it has
 * no `handleChange` that knows a checkbox from a radio, which is honest of it:
 * `handleChange` takes the next VALUE, and what the next value is is exactly
 * the question a group asks.
 */
export function createTanstackOptionField(
  form: AnyFormApi,
  options: FormFieldTypeOptions = {},
): UseFormOptionField {
  const { types = {} } = options;

  return function useTanstackOptionField(name) {
    const multiple = isMultipleField(types[name]);
    const field: AnyFieldApi = useField({ form, name });
    // Quiet until the field has been LEFT or the form has been sent once —
    // `isBlurred`, not `isTouched`, so a group does not shout on the first
    // click while a Formik-bound one beside it stays quiet.
    const submitted = useSelector(form.store, (s) => s.submissionAttempts > 0);
    const { value: stored, meta } = field.state;

    return {
      option: (value) => ({
        name,
        value,
        checked: isOptionChecked(stored, value, multiple),
        onChange: (event) => {
          const target = event.target as HTMLInputElement;
          field.handleChange(
            multiple ? checkedInGroup(target, name, stored, value) : value,
          );
        },
        onBlur: () => field.handleBlur(),
      }),
      errors: submitted || meta.isBlurred ? toMessages(meta.errors) : [],
    };
  };
}

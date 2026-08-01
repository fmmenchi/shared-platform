import { useFormContext, useFormState } from 'react-hook-form';
import type { UseFormField } from '@fmmenchi/ui';
import type { FormFieldTypeOptions } from '../field-type.types.js';

/**
 * `@fmmenchi/ui`'s field port, implemented for react-hook-form.
 *
 * Give it to the design system once and every bound component works:
 *
 *     <UiProvider adapters={{ i18n, form: { field: useRhfField, errors: useRhfErrors } }}>
 *
 * It READS; it decides nothing. Validation, submission, values and form state
 * all stay with react-hook-form — this only presents them in the shape the
 * design system asks for.
 *
 * Two things it has solved once, so no app rediscovers them:
 *
 * - **`useFormState`, not `formState` off the context.** That `formState` is a
 *   Proxy whose subscription does NOT reach a nested component: read it there
 *   and the error never arrives, with nothing to tell you.
 * - **Subscribed per FIELD** (`{ control, name }`), so one field's error does
 *   not re-render every other field in the form.
 *
 * The returned function is a HOOK, and must stay one: the design system calls it
 * inside the component that renders each field, so that component subscribes for
 * itself.
 *
 * `types` is only about NUMBERS here. react-hook-form is uncontrolled, so it
 * needs no help telling a checkbox from a text field — but a DOM value is always
 * a string, and `register` stores it verbatim. A `number` field would put `"31"`
 * where the schema expects `31`, and the form would then fail validation forever
 * with a message the user cannot act on by typing anything. `valueAsNumber` is
 * react-hook-form's own switch for exactly that; the map is what tells us to
 * throw it.
 */
export function createRhfField(
  options: FormFieldTypeOptions = {},
): UseFormField {
  const { types = {} } = options;

  return function useRhfField(name) {
    const { register, control } = useFormContext();
    const { errors } = useFormState({ control, name });
    return {
      control: register(name, {
        valueAsNumber: types[name] === 'number',
      }),
      error: errors[name]?.message as string | undefined,
    };
  };
}

/** The binding with no field types declared — every field reads as a string. */
export const useRhfField: UseFormField = createRhfField();

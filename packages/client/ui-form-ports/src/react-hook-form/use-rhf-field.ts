import { useFormContext, useFormState } from 'react-hook-form';
import type { UseFormField } from '@fmmenchi/ui';

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
 * It is a HOOK, and must stay one: the design system calls it inside the
 * component that renders each field, so that component subscribes for itself.
 */
export const useRhfField: UseFormField = (name) => {
  const { register, control } = useFormContext();
  const { errors } = useFormState({ control, name });
  return {
    control: register(name),
    error: errors[name]?.message as string | undefined,
  };
};

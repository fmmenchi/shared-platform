import { useFormContext, useFormState, type FieldError } from 'react-hook-form';
import type { UseFormErrors } from '@fmmenchi/ui';
import { toFieldMessages } from './rhf-messages.js';

/**
 * `@fmmenchi/ui`'s form-level port, implemented for react-hook-form — the
 * errors keyed by field name, which is what `FormErrorSummary` renders and
 * what no single field can provide.
 *
 * It reads each error through the same `toFieldMessages` as the field binding,
 * so a field and its entry in the summary cannot end up saying different
 * things — under `criteriaMode: 'all'` in particular, where the library reports
 * one message per rule.
 */
export const useRhfErrors: UseFormErrors = () => {
  const { control } = useFormContext();
  const { errors } = useFormState({ control });
  return Object.fromEntries(
    Object.entries(errors)
      .map(([name, error]) => [
        name,
        toFieldMessages(error as FieldError | undefined),
      ])
      .filter(([, messages]) => messages.length > 0),
  );
};

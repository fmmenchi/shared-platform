import { useFormContext, useFormState } from 'react-hook-form';
import type { UseFormErrors } from '@fmmenchi/ui';

/**
 * `@fmmenchi/ui`'s form-level port, implemented for react-hook-form — the
 * errors keyed by field name, which is what `FormErrorSummary` renders and
 * what no single field can provide.
 *
 * Normalised here so a summary never has to juggle the per-field shapes. One
 * message per field, which is what react-hook-form reports by default; under
 * `criteriaMode: 'all'` you would map `error.types` instead.
 */
export const useRhfErrors: UseFormErrors = () => {
  const { control } = useFormContext();
  const { errors } = useFormState({ control });
  return Object.fromEntries(
    Object.entries(errors).map(([name, error]) => [
      name,
      [String(error?.message ?? '')].filter(Boolean),
    ]),
  );
};

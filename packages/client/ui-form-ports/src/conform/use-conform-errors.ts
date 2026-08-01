import type { UseFormErrors } from '@fmmenchi/ui';
import type { FormMetadata } from '@conform-to/react';

/**
 * `@fmmenchi/ui`'s form-level port, implemented for Conform — every field in
 * error, keyed by name, which is what `FormErrorSummary` renders.
 *
 * Conform already keeps exactly that on the form metadata (`allErrors`), so
 * this is a pass-through rather than a normalisation. It takes the metadata
 * rather than reading a context because Conform's form object is what a screen
 * already holds.
 */
export function createConformErrors(
  form: Pick<FormMetadata<Record<string, unknown>>, 'allErrors'>,
): UseFormErrors {
  return function useConformErrors() {
    return form.allErrors;
  };
}

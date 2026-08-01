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
    // NORMALISED, not passed through, for two reasons the type does not show.
    //
    // `null` is Conform's own marker for "clear this field's error", and it
    // survives into `allErrors` on the `lastResult` path — server validation
    // fed back into the form. The summary then reads `.length` off it and the
    // page goes white.
    //
    // The empty key is Conform's FORM-level error (a schema `.refine()` with no
    // path). It is not a field, so it has no label and no control to link to —
    // listing it would render an entry with an empty name pointing at nothing.
    const byName: Record<string, readonly string[]> = {};
    for (const [name, messages] of Object.entries(form.allErrors)) {
      if (name === '' || !Array.isArray(messages) || messages.length === 0) {
        continue;
      }
      byName[name] = messages;
    }
    return byName;
  };
}

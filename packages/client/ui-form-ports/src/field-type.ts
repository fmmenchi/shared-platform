import type { FormFieldType } from './field-type.types.js';

/** Controls whose state is `checked`, not `value`. */
export function isBooleanField(type: FormFieldType | undefined): boolean {
  return type === 'checkbox';
}

import { getInputProps, useField } from '@conform-to/react';
import type { UseFormField } from '@fmmenchi/ui';
import type { FormFieldTypeOptions } from '../field-type.types.js';

/**
 * `@fmmenchi/ui`'s field port, implemented for Conform.
 *
 * `ariaAttributes: false` is load-bearing, not tidiness. Conform otherwise
 * emits an `aria-describedby` pointing at an error element IT expects you to
 * render — and the design system renders `FieldError` instead, so the reference
 * dangles. Measured before this switch: the attribute carried
 * `<form-id>-email-error`, which existed nowhere. Silent, and on the accessible
 * part.
 *
 * The `id` DOES come through and is kept: the field adopts whatever the control
 * brings and moves the label's `htmlFor` to match, so Conform keeps the id its
 * own markup refers to.
 *
 * The field TYPE matters here in a way it does not elsewhere: `getInputProps`
 * shapes the props by it, so a checkbox asked for as text never carries
 * `checked`. Hence the `types` map.
 */
export function createConformField(
  options: FormFieldTypeOptions = {},
): UseFormField {
  const { types = {} } = options;

  return function useConformField(name) {
    const [meta] = useField(name);
    return {
      control: getInputProps(meta, {
        type: types[name] ?? 'text',
        ariaAttributes: false,
      }),
      // Conform already reports a list, which is the port's shape — one of the
      // reasons the port took that shape.
      errors: meta.errors,
    };
  };
}

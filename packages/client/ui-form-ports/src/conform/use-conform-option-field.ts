import { getInputProps, useField } from '@conform-to/react';
import type { UseFormOptionField } from '@fmmenchi/ui';
import { isMultipleField } from '../field-type.js';
import type { FormFieldTypeOptions } from '../field-type.types.js';

/**
 * `@fmmenchi/ui`'s option-field port, implemented for Conform — one field drawn
 * as many controls.
 *
 * Conform is the one library that already had this shape and could not be
 * reached through the per-field port: `getInputProps(meta, { type, value })`
 * takes the OPTION's value and answers `defaultChecked` by comparing it against
 * what the field holds. It is a plain function, not a hook, so calling it once
 * per option is exactly what it is for — `useField` still runs once, at the top.
 *
 * `ariaAttributes: false` for the same reason as the per-field binding, and it
 * matters more here: Conform would otherwise emit an `aria-describedby` on EVERY
 * option pointing at an error element it expects you to render, so a group of
 * six would ship six dangling references instead of one.
 *
 * UNCONTROLLED, so there is no `onChange` and no `checked` — only
 * `defaultChecked`, and the DOM keeps the state from there. That is not a gap:
 * it is why a Conform form still submits with `FormData` when the bundle never
 * loads, and for a `checkbox-group` it is `FormData.getAll()` that assembles the
 * list rather than any code of ours.
 */
export function createConformOptionField(
  options: FormFieldTypeOptions = {},
): UseFormOptionField {
  const { types = {} } = options;

  return function useConformOptionField(name) {
    const [meta] = useField(name);
    // The control TYPE, not the field kind: one of many is drawn with radios,
    // several of many with checkboxes, and Conform shapes the props by it.
    const multiple = isMultipleField(types[name]);

    return {
      // TWO CALLS RATHER THAN A `type` VARIABLE, and the compiler is right to
      // insist: `InputOptions` is a union discriminated on `type`, so a value
      // typed `'checkbox' | 'radio'` matches neither arm — and the arms differ
      // in what `value` may be (a string only for these two; a boolean
      // elsewhere). Written out, each call picks its arm.
      option: (value) =>
        multiple
          ? getInputProps(meta, {
              type: 'checkbox',
              value,
              ariaAttributes: false,
            })
          : getInputProps(meta, {
              type: 'radio',
              value,
              ariaAttributes: false,
            }),
      // Conform already reports a list, which is the port's shape.
      errors: meta.errors,
    };
  };
}

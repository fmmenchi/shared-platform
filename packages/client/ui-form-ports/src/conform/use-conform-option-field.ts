import { getCollectionProps, useField } from '@conform-to/react';
import type { BoundOptionField, UseFormOptionField } from '@fmmenchi/ui';
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
      // `getCollectionProps`, NOT `getInputProps`, and the difference is two
      // defects rather than a preference. Conform ships this helper for exactly
      // this shape — "a collection of checkboxes or radio buttons" — and it is
      // the only one that gets both of these right:
      //
      // - **`id` per option.** `getInputProps` returns the FIELD's id, so a
      //   three-option group spread onto three inputs shipped three elements
      //   with the same id: `<label for>`, `aria-labelledby` and every a11y tool
      //   then resolve to the first radio. `getCollectionProps` derives
      //   `${metadata.id}-${value}`.
      // - **No `required` on a checkbox group.** `getFormControlProps` sets
      //   `required` from the constraint unconditionally, so with Conform's own
      //   documented setup (`useForm({ constraint: getZodConstraint(Schema) })`)
      //   a `z.array().min(1)` field put `required` on EVERY box and the browser
      //   refused to submit until all of them were ticked. Conform's source
      //   carries the warning verbatim: "The required attribute doesn't make
      //   sense for checkbox group / As it would require all checkboxes to be
      //   checked instead of at least one".
      //
      // It takes the whole option set, and one option is a set of one: the two
      // things it fixes are both per-option decisions, so `[value]` loses
      // nothing. The `key` it also returns is dropped by the port — a React key
      // belongs to whoever writes the list.
      option: (value) => {
        const [props] = getCollectionProps(meta, {
          type: multiple ? 'checkbox' : 'radio',
          options: [value],
          ariaAttributes: false,
        });
        return props as ReturnType<BoundOptionField['option']>;
      },
      // Conform already reports a list, which is the port's shape.
      errors: meta.errors,
    };
  };
}

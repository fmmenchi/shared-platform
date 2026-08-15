import {
  getInputProps,
  getSelectProps,
  getTextareaProps,
  useField,
} from '@conform-to/react';
import type { UseFormField } from '@fmmenchi/ui';
import { assertSingleField } from '../field-type.js';
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
    // Refuses the two field kinds that are drawn as MANY controls: Conform
    // passes this type straight to `getInputProps`, and `'checkbox-group'` is
    // no `<input type>` at all.
    const type = assertSingleField(name, types[name]) ?? 'text';
    /*
     * Conform has THREE helpers, one per element, and calling the wrong one is
     * not cosmetic: an adversarial review measured `getInputProps` emitting
     * `type`, `pattern`, `accept`, `min`, `step` and `multiple` onto a
     * `<select>` — and `multiple` turns it into a listbox, so the role the docs
     * and the tests state stopped holding. The design system now filters the
     * bag by tag as a net; this is the cure.
     */
    // A `Combobox`'s field IS a text input — its carrier — so Conform is asked
    // for that and not for a type it has no member for. That is ALL declaring
    // it does: `getInputProps` emits `pattern`, `multiple` and the length
    // constraints whatever type it is given, so this mapping does not keep them
    // off the key — `FormCombobox`'s routing table does. Said otherwise here
    // once, which is worth leaving in view: a comment claiming a guarantee the
    // code cannot make is worse than no comment.
    const shaped = type === 'combobox' ? 'text' : type;
    const control =
      shaped === 'select'
        ? getSelectProps(meta, { ariaAttributes: false })
        : shaped === 'textarea'
          ? getTextareaProps(meta, { ariaAttributes: false })
          : getInputProps(meta, { type: shaped, ariaAttributes: false });

    return {
      control,
      // Conform already reports a list, which is the port's shape — one of the
      // reasons the port took that shape.
      errors: meta.errors,
    };
  };
}

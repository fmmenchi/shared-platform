/**
 * The type of a field that is NOT a plain text input.
 *
 * Some libraries have to be told. A CONTROLLED library binds a text input
 * through `value` and a checkbox through `checked` — two different props — so it
 * cannot produce the right one from the name alone. react-hook-form never needs
 * this because it is uncontrolled: it binds by `name` and `ref` and lets the DOM
 * hold the state either way.
 *
 * Conform uses the full type (it shapes every prop by it); Formik and TanStack
 * only distinguish a boolean control from the rest. The map is the same at the
 * call site so that swapping libraries does not mean rewriting it.
 *
 * `radio` is deliberately ABSENT. A radio group is N controls sharing one name
 * with a distinct value each, so the option's value — the thing the binding
 * turns on — cannot be expressed in a map keyed by field NAME. Advertising it
 * would have meant a control that can never be selected: every option would
 * write the same value and none would read back as checked. That binding needs
 * its own shape, one name to many controls, and it does not exist yet.
 */
export type FormFieldType =
  | 'text'
  | 'email'
  | 'password'
  | 'checkbox'
  | 'number'
  | 'date'
  | 'search'
  | 'tel'
  | 'url';

export interface FormFieldTypeOptions {
  /**
   * The type of each field that is not a plain text input, by name:
   *
   *     createFormikField({ types: { tos: 'checkbox' } })
   *
   * A field left out is bound as text.
   */
  types?: Readonly<Record<string, FormFieldType>>;
}

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
 * It also decides how the value is READ BACK. A DOM value is always a string,
 * so a `number` field would otherwise put `"31"` where the schema expects a
 * number — and the form would fail validation forever with a message the user
 * cannot act on by typing anything. Leaving that to the consumer's schema is not
 * an answer: the port is what writes the value, so the loss is the port's to
 * undo. See `readValue`.
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
  | 'url'
  /**
   * The two that are not `<input>` types at all, but ELEMENTS. They are in the
   * same map because the map answers one question — "what kind of control is
   * this field?" — and an adapter that could not be told turned out to be a
   * real defect, not a hypothetical: Conform shapes every prop by this, so
   * without a member for them it called `getInputProps` for a select and
   * emitted `type`, `pattern`, `accept` and `multiple` onto it. `multiple`
   * flipped the element's role to `listbox`.
   */
  | 'select'
  | 'textarea';

export interface FormFieldTypeOptions<Name extends string = string> {
  /**
   * The type of each field that is not a plain text input, by name:
   *
   *     createFormikField<SignupValues>({ types: { tos: 'checkbox' } })
   *
   * A field left out is bound as text.
   *
   * THE KEYS ARE CHECKED when the factory is given the form's values type —
   * the same guarantee the typed kits give `name`, and for the same reason: a
   * misspelt key here is not an error, it is a field quietly bound as text, so
   * a `number` field stores `"31"` where the schema expects `31` and the form
   * fails validation forever. Without the values type, `Name` stays `string`
   * and every call site compiles as before.
   */
  types?: Readonly<Partial<Record<Name, FormFieldType>>>;
}

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
 * `radio` WAS deliberately absent, and the reason is worth keeping because it is
 * what shaped the fix. A radio group is N controls sharing one name with a
 * distinct value each, so the option's value — the thing the binding turns on —
 * could not be expressed in a map keyed by field NAME. Advertising it then would
 * have meant a control that can never be selected: every option writing the same
 * value, none reading back as checked.
 *
 * What was missing was never the map entry, it was the SHAPE: one name to many
 * controls. `UseFormOptionField` is that shape, and it moves the option's value
 * out of the map and into the call — `option('red')` — leaving this map with the
 * only question it was ever able to answer: what KIND of field is this. So the
 * two members below are now expressible, and mean cardinality rather than a tag:
 *
 * - `radio` — one of many. The stored value is the chosen option.
 * - `checkbox-group` — several of many, under one name. The stored value is a
 *   list, and the adapters that hold state (Formik, TanStack) add and remove
 *   from it; the uncontrolled ones (react-hook-form, Conform, React 19) let the
 *   DOM and `FormData` do it, which is what `FormData.getAll()` is for.
 *
 * Neither is reachable through `UseFormField`, and that is deliberate: bound
 * one-control-per-field a group can never report which option is checked.
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
  | 'textarea'
  /**
   * A `Combobox`. Not an `<input>` type either: the field a form sees is the
   * component's hidden CARRIER, a text input holding the chosen key, while the
   * visible box holds the query. Declaring it is what stops an adapter shaping
   * the carrier from a schema — Conform derives `type`, `pattern`, `min` and
   * `multiple` from the constraint, and a `pattern` checked against a key can
   * never match, which blocks the submit for good.
   */
  | 'combobox'
  /**
   * The two that are not one control at all, but a FIELD DRAWN AS MANY — see
   * the note above. They are bound through `UseFormOptionField`, never through
   * `UseFormField`.
   */
  | 'radio'
  | 'checkbox-group';

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

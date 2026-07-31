import type { ComponentProps } from 'react';

/**
 * How a form library binds ONE field, and the whole of what the design system
 * asks of it.
 *
 * It is a **hook**, not a plain function, and that is load-bearing rather than
 * stylistic. Measured: with a closure in context, the React Compiler caches the
 * provider — react-hook-form mutates its `errors` object in place, so the
 * closure's dependencies look unchanged — the provider never re-renders and the
 * error never reaches the field, silently. As a hook it is called inside each
 * bound component, so every field subscribes for itself and re-renders on its
 * own account. It also subscribes per FIELD rather than per form, so one
 * field's error does not re-render the rest.
 *
 * Being a hook, it obeys the rules of hooks: called unconditionally, at the top
 * of the component, once per field.
 *
 * It names no library, and cannot: `control` is a bag of NATIVE element props —
 * the widest interface there is, and one every form library already produces
 * (react-hook-form's `register`, Conform's `getInputProps`, Formik's
 * `getFieldProps`). `error` is a message, not a verdict: deciding WHEN a field
 * is invalid stays with the consumer (ADR-0013).
 */
export type UseFormField = (name: string) => BoundField;

export interface BoundField {
  /**
   * Spread onto the control. Native props only — `name`, `onChange`, `ref`, …
   *
   * Typed for `<input>` because that is what the bound components render today.
   * The native `size` attribute is omitted: on `Input` that name is the design
   * system's SIZING axis (`sm`/`md`/`lg`), so a number arriving from an adapter
   * would not typecheck and, worse, would silently mean something else. Widen
   * this — probably to a generic — when `Textarea` and `Select` land.
   */
  control: Omit<ComponentProps<'input'>, 'size'>;
  /**
   * The message to show when the field is in error. Absent means valid.
   *
   * A STRING, deliberately, not a `ReactNode`. Every form library produces a
   * string (react-hook-form, Formik) or an array of them (Conform) — so a
   * wider type would accept more than any implementation produces, and give
   * whoever writes an adapter nothing to aim at. It also makes Conform's
   * `string[]` a visible `.join(', ')` in the adapter rather than a silent
   * concatenation at render time.
   *
   * A rich message — one with a link in it — is outside this fast path by
   * construction: compose `Field` + `FieldError` by hand, where a `ReactNode`
   * is accepted.
   */
  error?: string;
}

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
   * What is wrong with the field. Absent means valid.
   *
   * A field rarely fails in exactly one way, so this takes the three shapes
   * form libraries actually produce, and the bound components render each
   * message as its OWN element rather than joining them:
   *
   * - **`string`** — one message. react-hook-form, Formik.
   * - **`string[]`** — several. Conform's `field.errors`.
   * - **`Record<string, string>`** — several, keyed by the rule that failed.
   *   react-hook-form's `errors[name].types` under `criteriaMode: 'all'`. The
   *   key is the stable identity, which is what a list needs and a bare array
   *   cannot give.
   *
   * NOT a `ReactNode`: it would accept all of the above and then render an
   * array as silently concatenated text, with no separator and no way to tell.
   * A rich message — one with a link in it — is outside this fast path by
   * construction: compose `Field` + `FieldError`, where a `ReactNode` fits.
   */
  error?: string | readonly string[] | Readonly<Record<string, string>>;
}

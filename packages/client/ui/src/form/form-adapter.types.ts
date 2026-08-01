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

/**
 * Every field currently in error, by name, each with ALL of its messages. A
 * hook, for the same reason `UseFormField` is one: called inside the component
 * that renders it, so that component subscribes for itself.
 *
 * ONE member, because exactly one component renders it — `FormErrorSummary`,
 * which needs errors keyed by name and cannot get them from any single field.
 * `submitting`, `isDirty`, `isValid`, `submitCount` and the rest are absent for
 * the opposite reason: nothing here would draw them.
 *
 * Submission state in particular is deliberately NOT here. React 19 already
 * reports it — `useFormStatus()` for a `<form action>` — and outside that an
 * app passes `isLoading` to `Button` in one line. A port member is owed by
 * every adapter that implements it, so it has to be earned.
 *
 * Adding a member later is backward compatible, so waiting costs nothing.
 */
export type UseFormErrors = () => Readonly<Record<string, FieldMessages>>;

/**
 * What is wrong with ONE field: zero messages or many, never a special case for
 * one.
 *
 * A list, and only a list. An earlier version took the three shapes the
 * libraries produce — a bare `string`, an array, an object keyed by the rule
 * that failed — and normalised them here. It cost more than it saved: three
 * shapes meant three key policies for the same rendered list, so the SAME
 * messages arriving as a string and as an array remounted differently, and the
 * array branch had nothing to key by but the index. Normalising is the
 * adapter's job anyway, which is the one place that knows which library it is
 * talking to; four of them now do it in a line each.
 *
 * It is also, exactly, what `UseFormErrors` reports per field — so the summary
 * and the field speak one language rather than two that need translating.
 *
 * The list is rendered one message per element, never joined: joined, a screen
 * reader reads "Too short.Needs a digit." as a single run-on statement. Order
 * is the adapter's, and the key is the message itself — the only stable
 * identity a message has, so a repeated one is a duplicate and is dropped.
 *
 * NOT `ReactNode`: it would accept all of the above and then render an array as
 * silently concatenated text, with no separator and no way to tell. A rich
 * message — one with a link in it — is outside this fast path by construction:
 * compose `Field` + `FieldError`, where a `ReactNode` fits.
 */
export type FieldMessages = readonly string[];

/**
 * The native controls a field can be, and the props each one takes.
 *
 * An adapter produces ONE bag of props without knowing which tag will receive
 * it — `name`, `onChange`, `ref` mean the same thing on all three. The types do
 * not agree, though: measured, a `control` typed for `<input>` fails on exactly
 * two properties when spread onto a `<textarea>` — `ref`
 * (`Ref<HTMLInputElement>` vs `Ref<HTMLTextAreaElement>`) and the event
 * handlers. Everything else, three hundred props of it, is assignable.
 *
 * So the bag is keyed by TAG, and the component that renders the element is the
 * one that says which. `input` omits the native `size` attribute: on `Input`
 * that name is the design system's sizing axis (`sm`/`md`/`lg`), so a number
 * arriving from an adapter would not typecheck and, worse, would quietly mean
 * something else. `textarea` omits `children`, which is how HTML sets its
 * initial text and a trap in React.
 */
export interface ControlPropsByTag {
  input: Omit<ComponentProps<'input'>, 'size'>;
  textarea: Omit<ComponentProps<'textarea'>, 'children'>;
  select: ComponentProps<'select'>;
}

/** Which native control a bound component renders. */
export type ControlTag = keyof ControlPropsByTag;

export interface BoundField<Tag extends ControlTag = 'input'> {
  /**
   * Spread onto the control. Native props only — `name`, `onChange`, `ref`, …
   *
   * Defaults to `input`, so every adapter written before the other tags existed
   * still says exactly what it said.
   */
  control: ControlPropsByTag[Tag];
  /**
   * What is wrong with the field — see {@link FieldMessages}. Absent, or empty,
   * means valid; a field rarely fails in exactly one way, so it is a list.
   *
   * Plural because it is plural. `error?: string` reads as "one message", which
   * is the misconception this shape exists to correct.
   */
  errors?: FieldMessages;
}

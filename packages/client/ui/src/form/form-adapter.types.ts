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
 * How a form library binds ONE field that is drawn as MANY controls — a radio
 * group, a set of checkboxes under one name, a multi-select's carriers.
 *
 * `UseFormField` cannot express this and the shape says why: it returns one bag
 * of props, and here every control needs the SAME `name` with a DIFFERENT
 * `value`, plus a `checked` that only the current value can answer. The
 * workaround `FormSegmentedControl` ships today is the evidence — it binds the
 * GROUP, delegating `change` (which bubbles, so `event.target.value` is the
 * chosen option) and dropping `ref` outright, because there is no "the input" of
 * a radio group. That works for one-of-many and gives up two things: a library
 * cannot focus the field from an error summary, and a ref-based library cannot
 * write a value back into it at all.
 *
 * THE HOOK IS STILL ONE PER FIELD. `option` is a plain function called during
 * render, once per rendered option — not a hook — so the rules of hooks hold
 * even though the number of options is data and can change between renders.
 * Every adapter is built that way: read the field once, then answer per value.
 *
 * This is also what makes a `'radio'` field type expressible at last. The reason
 * it was refused (recorded in `@fmmenchi/ui-form-ports`) was that "the option's
 * value cannot live in a map keyed by field NAME" — true, and it never had to:
 * the value arrives as the argument here, and the map only has to say what KIND
 * of field it is.
 */
export type UseFormOptionField = (name: string) => BoundOptionField;

/** One field, bound across the many controls that draw it. */
export interface BoundOptionField {
  /**
   * The props for the control standing for ONE option — spread onto it.
   *
   * Called during render, once per option, with that option's value. The
   * adapter answers `checked` (or `defaultChecked`, where the library is
   * uncontrolled) by comparing against the value it holds, which is the one
   * question a per-field bag could never answer.
   *
   * Typed as the `input` bag because every control this shape serves is an
   * `<input>`: a radio, a checkbox, or a hidden carrier.
   */
  option: (value: string) => ControlPropsByTag['input'];
  /**
   * THE WHOLE VALUE, replaced — for a field whose controls COME AND GO.
   *
   * `option` is a question a control asks about itself, and it is enough while
   * the controls are fixed: a radio group and a set of checkboxes are all
   * mounted from the first render, so each of them can speak, and a library
   * learns the value from the events they send. A multi-select's carriers are
   * not fixed. They appear as choices are made and disappear as they are taken
   * back — and **a removal is the absence of an element, so it has nobody to
   * send an event for it**.
   *
   * That is not a defect in any library, and it was measured rather than
   * reasoned about: in
   * `apps/ui-ports-validation/src/screens/carrier-count.test.tsx`, the two
   * bindings that read the DOM at submit are exact, and the three that keep a
   * store are told when a carrier arrives and never told when one leaves — so
   * the value keeps a key the reader removed, and the form posts something
   * nobody asked for. One of them also stores in the order it was TOLD rather
   * than the document's, so two readers who picked the same two things in a
   * different order submit different values.
   *
   * So the field says the whole truth instead. **The carriers draw the value;
   * they do not report it** — they exist to encode it for `FormData` and for a
   * page with no JavaScript, and this member is how a library that keeps a
   * store hears the same thing.
   *
   * OPTIONAL, and legitimately so: an adapter whose library reads the document
   * has nothing to update and implements nothing. One that keeps a store
   * implements it in a line, with the API it already has for setting a field.
   *
   * THE ORDER IS THE CALLER'S, and it is meaningful: the component knows the
   * order the choices were made in and the order it draws them in, and they are
   * the same one. An adapter must store the list as given.
   */
  setValues?: (values: readonly string[]) => void;
  /**
   * THE KEYS THE FIELD ALREADY HOLDS — the reader that matches the writer
   * above, and it exists because `option(value)` cannot do this job.
   *
   * A control drawing a set has to know what to draw BEFORE anything is
   * picked: a form whose defaults name two cities must open showing two. Asked
   * through `option`, that is one call per candidate — and it fails outright
   * for a ref-based library, whose bag carries no `checked` at all
   * (`register()` returns a name, handlers and a ref, nothing more). Measured:
   * seeded that way, a react-hook-form field holding two keys drew none.
   *
   * OPTIONAL, like its writer, and for a different reason: a binding that reads
   * the document has nothing to answer BEFORE the document exists — its value
   * IS the carriers, and at mount there are none. Those adapters return
   * `undefined` and the control starts empty, which is the truth there.
   */
  values?: readonly string[];
  /** What is wrong with the FIELD — see {@link FieldMessages}. Not per option. */
  errors?: FieldMessages;
}

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
 * one that says which. `input` and `select` both omit the native `size`
 * attribute: that name is the design system's sizing axis (`sm`/`md`/`lg`), so
 * a number arriving from an adapter would not typecheck and, worse, would
 * quietly mean something else — on a `<select>` it would turn the control into
 * a list box. `textarea` omits `children`, which is how HTML sets its initial
 * text and a trap in React.
 */
export interface ControlPropsByTag {
  input: Omit<ComponentProps<'input'>, 'size'>;
  textarea: Omit<ComponentProps<'textarea'>, 'children'>;
  select: Omit<ComponentProps<'select'>, 'size'>;
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

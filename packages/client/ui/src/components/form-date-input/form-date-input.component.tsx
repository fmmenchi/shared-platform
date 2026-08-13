import { Field } from '../field/field.component.js';
import { FieldDescription } from '../field-description/field-description.component.js';
import { FieldError } from '../field-error/field-error.component.js';
import { DateInput } from '../date-input/date-input.component.js';
import { useBoundField } from '../../form/form-adapter.context.js';
import {
  useBindingOwnedWarning,
  withoutBindingOwned,
} from '../../form/binding-owned.js';
import { toMessages } from '../../form/messages.js';
import type { FormDateInputProps } from './form-date-input.types.js';

/**
 * A labelled date field, already bound to the form library in scope:
 *
 *     <UiProvider adapters={useMyFormField}>
 *       <FormDateInput name="dob" label="Date of birth" />
 *     </UiProvider>
 *
 * It is `FormInput` with a different control inside, and deliberately so: a
 * `DateInput` is one text field, so it takes a `Field` and a `<label>` exactly
 * as `Input` does. There is no `Fieldset` here and no legend — those belong to
 * controls that are a GROUP, like a radio set or a `SegmentedControl`.
 *
 * What the binding sees is an ISO `YYYY-MM-DD` string on the carrier: one name,
 * one value, a real `input` event. What the user sees is that date written the
 * way their locale writes it. The two are never the same string, and that is
 * the point of the component.
 */
function FormDateInput(props: FormDateInputProps) {
  const { name, label, hint, ref, ...rest } = props;
  const { control, errors } = useBoundField(name, 'FormDateInput');
  useBindingOwnedWarning(rest, 'FormDateInput');
  // A field rarely fails in one way. Each message is its OWN element, so a
  // screen reader announces them as separate statements and the eye sees a list.
  const messages = toMessages(errors);

  // Everything the binding says EXCEPT the two the date field routes itself.
  // Kept as a spread rather than a hand-picked list, because the hand-picked
  // list is what dropped Conform's `required`, `id` and `form` — and a
  // `FormDateInput` rendered outside its `<form>` posts nothing at all without
  // that last one, while a `FormInput` beside it posts fine.
  const { value, defaultValue, ref: bindingRef, ...binding } = control;
  // Narrowed to a string because `control` is typed for an `<input>`, where a
  // value may also be a number or a list; an ISO date is neither.
  const asString = (candidate: unknown) =>
    typeof candidate === 'string' ? candidate : undefined;
  const seed = asString(defaultValue) ?? asString(value);

  return (
    <Field label={label} invalid={messages.length > 0}>
      {/* The adapter's props come FIRST so an explicit prop at the call site
          still wins. What the binding OWNS never reaches this spread: a `value`
          or an `onChange` from the call site does not override the binding, it
          severs it. `ref` is the exception that can be shared. */}
      <DateInput
        {...binding}
        // The adapter's starting value SEEDS an uncontrolled field, and it
        // arrives under either name: Conform's `getInputProps` emits
        // `defaultValue`, react-hook-form's `register` emits neither and leaves
        // the DOM to keep it, Formik and TanStack emit `value` on every render.
        // Reading only one of the two was a defect — under Conform the seed was
        // silently dropped and the field rendered empty next to `FormInput`s
        // that had filled themselves in.
        //
        // Neither is passed through as `value`: that would control the visible
        // field with an ISO string and show `2026-08-12` where the locale writes
        // `12/08/2026`.
        defaultValue={seed}
        value={undefined}
        {...withoutBindingOwned(rest)}
        // TWO REFS, because they have two jobs that want two different nodes.
        // THE BINDING'S goes to the CARRIER: react-hook-form reads `.value` off
        // the element its ref was given, and given the visible field it would
        // store `12/08/2026` — or, as measured before this line existed, never
        // receive the element at all and store `undefined` for every date field
        // in the form, no matter what was typed. THE CALL SITE'S goes to the
        // visible input, which is where focus belongs.
        carrierRef={bindingRef}
        ref={ref}
      />
      {/* Composed rather than passed as props, so the hint keeps its place
          BEFORE the errors however many of them there are. */}
      {hint === undefined ? null : <FieldDescription>{hint}</FieldDescription>}
      {/* Keyed by the message itself: the only identity a message has that
          survives an earlier one being fixed. */}
      {messages.map((message) => (
        <FieldError key={message}>{message}</FieldError>
      ))}
    </Field>
  );
}

export { FormDateInput };

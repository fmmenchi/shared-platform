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

  return (
    <Field label={label} invalid={messages.length > 0}>
      {/* The adapter's props come FIRST so an explicit prop at the call site
          still wins. What the binding OWNS never reaches this spread: a `value`
          or an `onChange` from the call site does not override the binding, it
          severs it. `ref` is the exception that can be shared. */}
      <DateInput
        name={control.name ?? name}
        onChange={control.onChange}
        onBlur={control.onBlur}
        // The adapter's value SEEDS an uncontrolled field — Conform's
        // `getInputProps` supplies one, react-hook-form's `register` does not
        // and leaves the DOM to keep it. It is NOT spread as `value`: that would
        // control the visible field with an ISO string and show the user
        // `2026-08-12` where their locale writes `12/08/2026`. Narrowed to a
        // string because `control` is typed for an `<input>`, where `value` may
        // also be a number or a list; an ISO date is neither.
        defaultValue={
          typeof control.value === 'string' ? control.value : undefined
        }
        {...withoutBindingOwned(rest)}
        // THE BINDING'S `ref` IS NOT FORWARDED, and that is a limitation rather
        // than an oversight. It has two jobs that want two different elements: a
        // library reading an uncontrolled value wants the CARRIER, which holds
        // the ISO string, and a library focusing a field from an error summary
        // wants the VISIBLE input, since the carrier is hidden and cannot take
        // focus. One ref cannot be both, and pointing it at the visible field
        // would hand `12/08/2026` to a library expecting a value — wrong
        // quietly, which is worse than absent loudly. Adapters that read the
        // change EVENT are unaffected: it comes off the carrier, so
        // `event.target.value` is the ISO date and `event.target.name` is the
        // field. The call site's own `ref` still reaches the visible input.
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

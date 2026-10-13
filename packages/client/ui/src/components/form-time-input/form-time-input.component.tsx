import { Field } from '../field/field.component.js';
import { FieldDescription } from '../field-description/field-description.component.js';
import { FieldError } from '../field-error/field-error.component.js';
import { TimeInput } from '../time-input/time-input.component.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import {
  useBindingOwnedWarning,
  withoutBindingOwned,
} from '../../form/binding-owned.js';
import { toMessages } from '../../form/messages.js';
import { useBoundCarrierField } from '../../form/use-bound-carrier-field.js';
import type { FormTimeInputProps } from './form-time-input.types.js';

/**
 * A labelled time field, already bound to the form library in scope:
 *
 *     <UiProvider adapters={useMyFormField}>
 *       <FormTimeInput name="opens" label="Opens at" />
 *     </UiProvider>
 *
 * It is `FormDateInput` with a different control inside. The frames differ;
 * the binding does not, and it is the same hook: `useBoundCarrierField` routes
 * the adapter's bag onto the carrier and records why each line of the routing
 * exists.
 *
 * What the binding sees is `HH:mm` on the carrier: one name, one value, a real
 * `input` event. What the user sees is that time in their locale's hour cycle.
 * The two are never the same string on an `en-US` page, and that is the point
 * of the component.
 */
function FormTimeInput(props: FormTimeInputProps) {
  const { name, label, hint, ref, ...rest } = props;
  const bound = useBoundCarrierField(name, 'FormTimeInput');
  useBindingOwnedWarning(rest, 'FormTimeInput');
  // The type refuses `defaultTime`; this is for the callers the type does not
  // see, and for the same reason the shared guard exists at all.
  useDevWarning(
    'defaultTime' in rest,
    "FormTimeInput: `defaultTime` is the binding's to set, not the call site's — it would seed the DOM without telling your form library, which then validates an empty field and overwrites the seed. Give the value to the library instead.",
  );
  // A field rarely fails in one way. Each message is its OWN element, so a
  // screen reader announces them as separate statements and the eye sees a list.
  const messages = toMessages(bound.errors);

  return (
    <Field label={label} invalid={messages.length > 0}>
      {/* The adapter's props come FIRST so an explicit prop at the call site
          still wins. What the binding OWNS never reaches this spread: a `value`
          or an `onChange` from the call site does not override the binding, it
          severs it. `ref` is the exception that can be shared — the call
          site's goes to the visible input, where focus belongs; the binding's
          is inside `carrierRef`. */}
      <TimeInput
        {...bound.binding}
        name={bound.name}
        defaultValue={bound.seed}
        value={undefined}
        {...withoutBindingOwned(rest)}
        carrierRef={bound.carrierRef}
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

export { FormTimeInput };

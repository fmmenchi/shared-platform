import { Field } from '../field/field.component.js';
import { FieldDescription } from '../field-description/field-description.component.js';
import { FieldError } from '../field-error/field-error.component.js';
import { TimeInput } from '../time-input/time-input.component.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { useBoundField } from '../../form/form-adapter.context.js';
import {
  useBindingOwnedWarning,
  withoutBindingOwned,
} from '../../form/binding-owned.js';
import { toMessages } from '../../form/messages.js';
import { useBoundCarrier } from '../../form/use-bound-carrier.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import type { FormTimeInputProps } from './form-time-input.types.js';

/**
 * A labelled time field, already bound to the form library in scope:
 *
 *     <UiProvider adapters={useMyFormField}>
 *       <FormTimeInput name="opens" label="Opens at" />
 *     </UiProvider>
 *
 * It is `FormDateInput` with a different control inside, and every line below
 * that looks like a copy is one the date field paid for in a measured defect —
 * the routing table, the two names a seed arrives under, the two refs. The
 * frames differ; the binding does not.
 *
 * What the binding sees is `HH:mm` on the carrier: one name, one value, a real
 * `input` event. What the user sees is that time in their locale's hour cycle.
 * The two are never the same string on an `en-US` page, and that is the point
 * of the component.
 */
function FormTimeInput(props: FormTimeInputProps) {
  const { name, label, hint, ref, ...rest } = props;
  const { control, errors } = useBoundField(name, 'FormTimeInput');
  useBindingOwnedWarning(rest, 'FormTimeInput');
  // The type refuses `defaultTime`; this is for the callers the type does not
  // see, and for the same reason the shared guard exists at all.
  useDevWarning(
    'defaultTime' in rest,
    "FormTimeInput: `defaultTime` is the binding's to set, not the call site's — it would seed the DOM without telling your form library, which then validates an empty field and overwrites the seed. Give the value to the library instead.",
  );
  // A field rarely fails in one way. Each message is its OWN element, so a
  // screen reader announces them as separate statements and the eye sees a list.
  const messages = toMessages(errors);

  // A ROUTING TABLE, not a blanket spread and not a hand-picked list — both of
  // those were wrong on the date field, in opposite directions, and the reasons
  // carry over unchanged.
  //
  // The hand-picked list dropped Conform's `required`, `id` and `form`, and a
  // field rendered outside its `<form>` posts nothing without the last of those.
  // The blanket spread that replaced it forwarded `type`: declare
  // `types: { opens: 'time' }`, which is the natural thing to declare for a
  // time, and the visible field would become the NATIVE time control — the one
  // ADR-0027 refuses and this component exists to replace, drawing `14:30` on a
  // page whose `Time` says `02:30 PM`. It also forwarded `pattern`, `min`,
  // `max` and `step`, which a schema derives from the ISO value and which are
  // then checked against `02:30 PM` — a `pattern` that can never match blocks
  // the submit for good, and `min`/`max` are inert on a text input, so the range
  // goes silently unenforced.
  //
  // So: what describes a NATIVE CONTROL THIS IS NOT never travels. Everything
  // else does, and `TimeInput` routes `name`, `form`, `onChange` and `onBlur` to
  // the carrier itself, because that is the node with the name.
  const {
    value,
    defaultValue,
    ref: bindingRef,
    type,
    pattern,
    min,
    max,
    step,
    accept,
    multiple,
    checked,
    defaultChecked,
    ...binding
  } = control;
  // Narrowed to a string because `control` is typed for an `<input>`, where a
  // value may also be a number or a list; an ISO time is neither.
  const asString = (candidate: unknown) =>
    typeof candidate === 'string' ? candidate : undefined;
  const seed = asString(defaultValue) ?? asString(value);
  // A CONTROLLED adapter hands over `value` and no ref, so nothing it does
  // after the first render reaches the field — the seed above is a one-shot.
  // This follows it onto the carrier, where the field is already watching.
  const carrier = useBoundCarrier(asString(value));

  return (
    <Field label={label} invalid={messages.length > 0}>
      {/* The adapter's props come FIRST so an explicit prop at the call site
          still wins. What the binding OWNS never reaches this spread: a `value`
          or an `onChange` from the call site does not override the binding, it
          severs it. `ref` is the exception that can be shared. */}
      <TimeInput
        {...binding}
        // The fallback the spread quietly dropped. `name` is optional on the
        // port's control, and without one the carrier is nameless: nothing is
        // submitted, and `FormErrorSummary` — which finds a field by `name` —
        // cannot reach it. Those are the two jobs the carrier exists for.
        name={control.name ?? name}
        // The adapter's starting value SEEDS an uncontrolled field, and it
        // arrives under either name: Conform's `getInputProps` emits
        // `defaultValue`, react-hook-form's `register` emits neither and leaves
        // the DOM to keep it, Formik and TanStack emit `value` on every render.
        // Reading only one of the two was a defect on the date field — under
        // Conform the seed was silently dropped and the field rendered empty.
        //
        // Neither is passed through as `value`: that would control the visible
        // field with an ISO string and show `14:30` where the locale writes
        // `02:30 PM`.
        defaultValue={seed}
        value={undefined}
        {...withoutBindingOwned(rest)}
        // TWO REFS, because they have two jobs that want two different nodes.
        // THE BINDING'S goes to the CARRIER: react-hook-form reads `.value` off
        // the element its ref was given, and given the visible field it would
        // store `02:30 PM` — or, as measured on the date field before this line
        // existed, never receive the element at all and store `undefined` for
        // every such field in the form. THE CALL SITE'S goes to the visible
        // input, which is where focus belongs.
        carrierRef={(node) => mergeRefs(carrier, bindingRef)(node)}
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

import { Field } from '../field/field.component.js';
import { FieldDescription } from '../field-description/field-description.component.js';
import { FieldError } from '../field-error/field-error.component.js';
import { Combobox } from '../combobox/combobox.component.js';
import { useBoundField } from '../../form/form-adapter.context.js';
import {
  useBindingOwnedWarning,
  withoutBindingOwned,
} from '../../form/binding-owned.js';
import { toMessages } from '../../form/messages.js';
import { useBoundCarrier } from '../../form/use-bound-carrier.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import type { FormComboboxProps } from './form-combobox.types.js';

/**
 * A labelled combobox, already bound to the form library in scope:
 *
 *     <FormCombobox name="city" label="City" items={cities}
 *       getKey={(c) => c.id} getLabel={(c) => c.name} />
 *
 * It is `FormDateInput`'s shape with a different control inside, and for the
 * same reason: both are one field whose VALUE lives on a carrier while the
 * visible box shows something else. So the binding goes to the carrier and the
 * call site's `ref` to the field, and neither has to know about the other.
 *
 * A ROUTING TABLE, not a blanket spread — the lesson `FormDateInput` paid for
 * twice. A hand-picked list dropped Conform's `required`, `id` and `form`, and a
 * field rendered outside its `<form>` posts nothing without the last of those.
 * A blanket spread forwarded `type`, `pattern`, `min`, `max`, `step` and
 * `multiple`, which a schema derives from the value and which are then checked
 * against a KEY: a `pattern` that can never match blocks the submit for good.
 * So what describes a native control this is not never travels; everything else
 * does.
 */
function FormCombobox<T>(props: FormComboboxProps<T>) {
  const { name, label, hint, ref, ...rest } = props;
  const { control, errors } = useBoundField(name, 'FormCombobox');
  useBindingOwnedWarning(rest, 'FormCombobox');
  const messages = toMessages(errors);

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
  // value may also be a number or a list; a key is neither.
  const asString = (candidate: unknown) =>
    typeof candidate === 'string' ? candidate : undefined;
  // The adapter's starting value arrives under either name: Conform emits
  // `defaultValue`, react-hook-form emits neither and leaves the DOM to keep
  // it, Formik and TanStack emit `value` on every render.
  const seed = asString(defaultValue) ?? asString(value);
  // A CONTROLLED adapter hands over `value` and no ref, so nothing it does
  // after the first render reaches the field. This follows it onto the carrier,
  // which is where the component is already watching.
  const carrier = useBoundCarrier(asString(value));

  return (
    <Field label={label} invalid={messages.length > 0}>
      <Combobox
        {...binding}
        // `name` is optional on the port's control, and without one the carrier
        // is nameless: nothing is submitted, and `FormErrorSummary` — which
        // finds a field by `name` — cannot reach it.
        name={control.name ?? name}
        // The key the binding starts with, as the component's own uncontrolled
        // seed. Passed as `defaultValue` and never as `value`: controlling the
        // choice from here would take it away from the component AND from the
        // consumer at once.
        defaultValue={seed ?? null}
        {...withoutBindingOwned(rest)}
        // TWO REFS, two jobs, two nodes. THE BINDING'S goes to the CARRIER —
        // react-hook-form reads `.value` off the element its ref was given, and
        // given the visible field it would store the search text. THE CALL
        // SITE'S goes to the visible input, which is where focus belongs.
        carrierRef={(node) => mergeRefs(carrier, bindingRef)(node)}
        ref={ref}
      />
      {hint === undefined ? null : <FieldDescription>{hint}</FieldDescription>}
      {messages.map((message) => (
        <FieldError key={message}>{message}</FieldError>
      ))}
    </Field>
  );
}

export { FormCombobox };

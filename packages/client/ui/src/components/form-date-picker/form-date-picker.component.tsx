import { Field } from '../field/field.component.js';
import { FieldDescription } from '../field-description/field-description.component.js';
import { FieldError } from '../field-error/field-error.component.js';
import { DatePicker } from '../date-picker/date-picker.component.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { useBoundField } from '../../form/form-adapter.context.js';
import {
  useBindingOwnedWarning,
  withoutBindingOwned,
} from '../../form/binding-owned.js';
import { toMessages } from '../../form/messages.js';
import type { FormDatePickerProps } from './form-date-picker.types.js';

/**
 * A labelled date field with a calendar behind it, already bound to the form
 * library in scope:
 *
 *     <UiProvider adapters={{ form: { field: useMyFormField } }}>
 *       <FormDatePicker name="departure" label="Departure" />
 *     </UiProvider>
 *
 * It is `FormDateInput` with a calendar, and the routing below is the same
 * routing for the same reasons — read that component for why a binding's props
 * travel through a table rather than a spread.
 *
 * WHAT THIS ONE ADDS is the thing the hand-composed picker cannot have. In
 * `FormDateInput` the binding's ref goes to the carrier and a call site cannot
 * redirect it, so a calendar beside it has no way to reach the node and must
 * write through the library's own lever — `setValue`, `handleChange`, whichever
 * one this library calls it. Here the component renders the field itself, so it
 * holds its own reference to the carrier ALONGSIDE the binding's, and writes it
 * the way a keystroke does: a real `input` event the library hears. The result
 * is that the bound picker needs no library-specific code at all.
 */
function FormDatePicker(props: FormDatePickerProps) {
  // `defaultDate` is DROPPED, not merely warned about. The warning below says
  // it "would seed the DOM without telling your form library" — and it did:
  // measured through the untyped route, the seed landed and the library never
  // heard of it. A guard that describes a harm in the conditional while letting
  // it happen is worse than none, because it reads as protection. This matches
  // the shared `withoutBindingOwned` guard, which warns AND removes.
  const { name, label, hint, ref, defaultDate, ...rest } =
    props as FormDatePickerProps & { defaultDate?: unknown };
  const { control, errors } = useBoundField(name, 'FormDatePicker');
  useBindingOwnedWarning(rest, 'FormDatePicker');
  // The type refuses `defaultDate`; this is for the callers the type does not
  // see, and for the same reason the shared guard exists at all.
  useDevWarning(
    defaultDate !== undefined,
    "FormDatePicker: `defaultDate` is the binding's to set, not the call site's — it would seed the DOM without telling your form library, which then validates an empty field and overwrites the seed. It was ignored; give the value to the library instead.",
  );
  const messages = toMessages(errors);

  // THE SAME ROUTING TABLE `FormDateInput` uses, and it is not a shortcut for a
  // spread: what describes a NATIVE CONTROL THIS IS NOT must never travel. A
  // schema declaring `types: { departure: 'date' }` forwards `type="date"`,
  // which would turn the visible field into a native picker whose ISO value the
  // mask then re-segments into a different date; `pattern`, `min`, `max` and
  // `step` arrive the same way and are checked against `12/08/2026`.
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
  // value may also be a number or a list; an ISO date is neither.
  const asString = (candidate: unknown) =>
    typeof candidate === 'string' ? candidate : undefined;
  const seed = asString(defaultValue) ?? asString(value);

  return (
    <Field label={label} invalid={messages.length > 0}>
      <DatePicker
        {...binding}
        // The fallback the spread quietly drops: `name` is optional on the
        // port's control, and without one the carrier is nameless — nothing is
        // submitted, and `FormErrorSummary` cannot find the field.
        name={control.name ?? name}
        // The adapter's starting value seeds an uncontrolled field, and arrives
        // under either name depending on the library. Never passed through as
        // `value`, which would control the visible field with an ISO string and
        // show `2026-08-12` where the locale writes `12/08/2026`.
        // No `value={undefined}` any more: `DatePicker` refuses the prop
        // outright now, so there is nothing left to neutralise.
        defaultValue={seed}
        {...withoutBindingOwned(rest)}
        // TWO REFS, TWO JOBS. The binding's goes to the carrier, because a
        // library reads `.value` off the element its ref was given and the
        // visible field holds `12/08/2026`. The call site's goes to the visible
        // input, which is where focus belongs. `DatePicker` merges a third of
        // its own into the first, which is how the calendar writes the field.
        carrierRef={bindingRef}
        ref={ref}
      />
      {hint === undefined ? null : <FieldDescription>{hint}</FieldDescription>}
      {/* Keyed by the message itself: the only identity a message has that
          survives an earlier one being fixed. */}
      {messages.map((message) => (
        <FieldError key={message}>{message}</FieldError>
      ))}
    </Field>
  );
}

export { FormDatePicker };

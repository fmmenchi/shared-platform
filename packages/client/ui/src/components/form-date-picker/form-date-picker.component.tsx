import { Field } from '../field/field.component.js';
import { FieldDescription } from '../field-description/field-description.component.js';
import { FieldError } from '../field-error/field-error.component.js';
import { DatePicker } from '../date-picker/date-picker.component.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import {
  useBindingOwnedWarning,
  withoutBindingOwned,
} from '../../form/binding-owned.js';
import { toMessages } from '../../form/messages.js';
import { useBoundCarrierField } from '../../form/use-bound-carrier-field.js';
import { useMessages } from '../../i18n/provider.js';
import { datePickerMessages } from '../date-picker/date-picker.messages.js';
import type { FormDatePickerProps } from './form-date-picker.types.js';

/**
 * A labelled date field with a calendar behind it, already bound to the form
 * library in scope:
 *
 *     <UiProvider adapters={{ form: { field: useMyFormField } }}>
 *       <FormDatePicker name="departure" label="Departure" />
 *     </UiProvider>
 *
 * It is `FormDateInput` with a calendar, bound through the same
 * `useBoundCarrierField` for the same reasons — read that hook for why a
 * binding's props travel through a table rather than a spread.
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
  const bound = useBoundCarrierField(name, 'FormDatePicker');
  useBindingOwnedWarning(rest, 'FormDatePicker');
  // The type refuses `defaultDate`; this is for the callers the type does not
  // see, and for the same reason the shared guard exists at all.
  useDevWarning(
    defaultDate !== undefined,
    "FormDatePicker: `defaultDate` is the binding's to set, not the call site's — it would seed the DOM without telling your form library, which then validates an empty field and overwrites the seed. It was ignored; give the value to the library instead.",
  );
  const messages = toMessages(bound.errors);

  // THE TRIGGER TAKES ITS NAME FROM THE FIELD'S LABEL. The default names the
  // button by what it does — "Choose from a calendar" — which stops being a
  // name the moment a form has two dates in it: a reader listing the buttons,
  // or landing on one after a scroll, meets the same words twice with nothing
  // to tell them apart, and neither `Field` nor `InputGroup` is a naming
  // ancestor that could disambiguate them.
  //
  // Only when the label is a STRING. It is a `ReactNode`, so it may be markup
  // with elements in it, and flattening that into an attribute would produce
  // either "[object Object]" or a name that silently drops half the label.
  // Those call sites pass `triggerLabel` themselves, and an explicit one always
  // wins over this.
  const t = useMessages(datePickerMessages);
  const composed =
    typeof label === 'string' ? t('triggerFor', { field: label }) : undefined;

  return (
    <Field label={label} invalid={messages.length > 0}>
      <DatePicker
        {...bound.binding}
        name={bound.name}
        // No `value={undefined}` here: `DatePicker` refuses the prop outright,
        // so there is nothing left to neutralise.
        defaultValue={bound.seed}
        {...withoutBindingOwned(rest)}
        triggerLabel={
          (rest as { triggerLabel?: string }).triggerLabel ?? composed
        }
        // The binding's ref is inside `carrierRef`; `DatePicker` merges a
        // third of its own into it, which is how the calendar writes the
        // field. The call site's goes to the visible input, where focus
        // belongs.
        carrierRef={bound.carrierRef}
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

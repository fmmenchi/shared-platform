import { Fieldset } from '../fieldset/fieldset.component.js';
import { FieldsetLegend } from '../fieldset-legend/fieldset-legend.component.js';
import { FieldsetContent } from '../fieldset-content/fieldset-content.component.js';
import { FieldDescription } from '../field-description/field-description.component.js';
import { FieldError } from '../field-error/field-error.component.js';
import { DateRangePicker } from '../date-range-picker/date-range-picker.component.js';
import {
  useBindingOwnedWarning,
  withoutBindingOwned,
} from '../../form/binding-owned.js';
import { useBoundCarrierField } from '../../form/use-bound-carrier-field.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { toMessages } from '../../form/messages.js';
import type { FormDateRangePickerProps } from './form-date-range-picker.types.js';

/**
 * A labelled date range, already bound to the form library in scope:
 *
 *     <UiProvider adapters={{ form: { field: useMyFormField } }}>
 *       <FormDateRangePicker
 *         startName="checkIn"
 *         endName="checkOut"
 *         startLabel="Check-in"
 *         endLabel="Check-out"
 *         legend="Your stay"
 *       />
 *     </UiProvider>
 *
 * IT BINDS TWO FIELDS, which is what makes it the first of its kind here. The
 * port is a hook per field, so two fields are two calls of it — both
 * unconditional and in a fixed order, as the rules of hooks require and as the
 * port's own contract already asked for. `useBoundCarrierField` is that call,
 * once per end, and it routes each end's bag the way `FormDateInput` routes
 * its one: what describes a native date control never travels.
 *
 * THE SHELL IS A `Fieldset`, not a `Field`. `Field` gives its control an id and
 * expects one control to take it: measured with two, both inputs carried the
 * same id and its label named neither. Two labelled controls are a group, and
 * a group is named by a legend.
 */
function FormDateRangePicker(props: FormDateRangePickerProps) {
  const { startName, endName, startLabel, endLabel, legend, hint, ...rest } =
    props;

  // TWO CALLS, in a fixed order, unconditionally — which is exactly what the
  // port asks of its consumers and why no new port shape was needed.
  const start = useBoundCarrierField(startName, 'FormDateRangePicker');
  const end = useBoundCarrierField(endName, 'FormDateRangePicker');
  useBindingOwnedWarning(rest, 'FormDateRangePicker');
  // TWO NAMES OR NOTHING. Given the same one twice, both hooks bind the same
  // field, two carriers post under one key, and the binding's ref ends on
  // whichever mounted last — measured, a ref-based library read the END and
  // never saw the start. `Field` flags its analogous misuse; this flags its
  // own rather than aliasing in silence.
  useDevWarning(
    startName === endName,
    `FormDateRangePicker: \`startName\` and \`endName\` are both "${startName}". A range is two values and posts as two entries, so each end needs its own name — with one, both carriers submit under it and a binding's ref lands on whichever field mounted last.`,
  );

  // BOTH ENDS' MESSAGES, in field order, under one group — and KEYED BY THEIR
  // END as well as their text. `toMessages` dedupes within one field and cannot
  // across two, so two ends returning the same "Required." produced duplicate
  // React keys: measured, an "Encountered two children with the same key"
  // error on every render of a case the docs call out as expected. The end is
  // what makes them different, so the end is what belongs in the key.
  const messages = [
    ...toMessages(start.errors).map((text) => ({ key: `start:${text}`, text })),
    ...toMessages(end.errors).map((text) => ({ key: `end:${text}`, text })),
  ];

  return (
    <Fieldset invalid={messages.length > 0}>
      <FieldsetLegend>{legend}</FieldsetLegend>
      <FieldsetContent>
        <DateRangePicker
          {...withoutBindingOwned(rest)}
          // PER FIELD, not shared. Everything a `DateRangePicker` takes at the
          // top level reaches BOTH inputs — right for `disabled`, wrong for a
          // binding. Measured before these two channels existed: the start's
          // `onChange` was attached to both carriers, so the start's binding
          // was told the END's value.
          // AND THE INVALID STATE ON BOTH CONTROLS. `Fieldset` takes `invalid`
          // and turns it into a styling hook — it only sets `aria-invalid` when
          // it is a `radiogroup` — and a control inside a group does not
          // inherit the group's description either. Measured: swapping the day
          // picker for this one dropped `aria-invalid` from the accessibility
          // tree entirely, so a reader was told nothing at all.
          startFieldProps={{
            ...start.binding,
            'aria-invalid': toMessages(start.errors).length > 0 || undefined,
          }}
          endFieldProps={{
            ...end.binding,
            'aria-invalid': toMessages(end.errors).length > 0 || undefined,
          }}
          startName={start.name}
          endName={end.name}
          startLabel={startLabel}
          endLabel={endLabel}
          defaultStart={start.seed}
          defaultEnd={end.seed}
          // EACH BINDING'S REF TO ITS OWN CARRIER, merged with the picker's own
          // so the calendar can still write the fields.
          startCarrierRef={start.carrierRef}
          endCarrierRef={end.carrierRef}
        />
      </FieldsetContent>
      {hint === undefined ? null : <FieldDescription>{hint}</FieldDescription>}
      {/* Keyed by the message itself: the only identity a message has that
          survives an earlier one being fixed. */}
      {messages.map((message) => (
        <FieldError key={message.key}>{message.text}</FieldError>
      ))}
    </Fieldset>
  );
}

export { FormDateRangePicker };

import { Fieldset } from '../fieldset/fieldset.component.js';
import { FieldsetLegend } from '../fieldset-legend/fieldset-legend.component.js';
import { FieldsetContent } from '../fieldset-content/fieldset-content.component.js';
import { ToggleGroup } from '../toggle-group/toggle-group.component.js';
import { FieldDescription } from '../field-description/field-description.component.js';
import { FieldError } from '../field-error/field-error.component.js';
import { useBoundField } from '../../form/form-adapter.context.js';
import {
  useBindingOwnedWarning,
  withoutBindingOwned,
} from '../../form/binding-owned.js';
import { toMessages } from '../../form/messages.js';
import type { FormToggleGroupProps } from './form-toggle-group.types.js';

/**
 * A bound set of one-of-many options, drawn as buttons:
 *
 *     <FormToggleGroup name="align" label="Text alignment">
 *       <ToggleGroupItem value="left">Left</ToggleGroupItem>
 *       <ToggleGroupItem value="center">Center</ToggleGroupItem>
 *     </FormToggleGroup>
 *
 * THE GROUP IS NAMED ONCE, by the legend. `ToggleGroup` is handed no `label`
 * here on purpose: two names are announced twice ("Text alignment, group …
 * Text alignment, radio group"), and of the two the visible legend is the one
 * worth keeping — a segmented control in a form with no title is a defect no
 * test catches and every sighted user sees. The `role="radiogroup"` goes with
 * the name it no longer has; the options are grouped by the `<fieldset>` and
 * paired by `name`, which is what the platform actually reads.
 *
 * THE PORT ASSUMES ONE CONTROL PER FIELD, and a group is the first place that
 * shows. Two of the three keys in `control` bend:
 *
 * - `onChange` has no single input to sit on, so it goes on the group and
 *   works by DELEGATION — `change` bubbles, and `event.target.value` is the
 *   chosen option. That is a real event from a real radio, not a synthesised
 *   one, so every adapter reads it the way it already does.
 * - `ref` has no right answer here: there is no "the input" of a radio group.
 *   It is deliberately NOT forwarded. A library that uses it to focus a field
 *   from an error summary will not reach this one — stated in the docs rather
 *   than papered over by pointing it at whichever option happens to be first,
 *   which would be arbitrary and would move when the options are reordered.
 */
function FormToggleGroup(props: FormToggleGroupProps) {
  const { name, label, hint, children, ...rest } = props;
  const { control, errors } = useBoundField(name, 'FormToggleGroup');
  useBindingOwnedWarning(rest, 'FormToggleGroup');
  const messages = toMessages(errors);

  return (
    <Fieldset invalid={messages.length > 0}>
      <FieldsetLegend>{label}</FieldsetLegend>
      <FieldsetContent>
        <ToggleGroup
          name={control.name ?? name}
          // The adapter's value, when it has one — Conform's `getInputProps`
          // does, react-hook-form's `register` does not and leaves the DOM to
          // keep it. Narrowed to a string because `control` is typed for an
          // `<input>`, where `value` may also be a number or a list; neither is
          // a thing one of these options can be.
          value={typeof control.value === 'string' ? control.value : undefined}
          onChange={control.onChange}
          {...withoutBindingOwned(rest)}
        >
          {children}
        </ToggleGroup>
      </FieldsetContent>
      {hint === undefined ? null : <FieldDescription>{hint}</FieldDescription>}
      {messages.map((message) => (
        <FieldError key={message}>{message}</FieldError>
      ))}
    </Fieldset>
  );
}

export { FormToggleGroup };

import { Fieldset } from '../fieldset/fieldset.component.js';
import { FieldsetLegend } from '../fieldset-legend/fieldset-legend.component.js';
import { FieldsetContent } from '../fieldset-content/fieldset-content.component.js';
import { SegmentedControl } from '../segmented-control/segmented-control.component.js';
import { FieldDescription } from '../field-description/field-description.component.js';
import { FieldError } from '../field-error/field-error.component.js';
import { useBoundOptionField } from '../../form/form-adapter.context.js';
import { OptionBindingProvider } from '../../form/option-binding.context.js';
import {
  useBindingOwnedWarning,
  withoutBindingOwned,
} from '../../form/binding-owned.js';
import { toMessages } from '../../form/messages.js';
import type { FormSegmentedControlProps } from './form-segmented-control.types.js';

/**
 * A bound set of one-of-many options, drawn as buttons:
 *
 *     <FormSegmentedControl name="align" label="Text alignment">
 *       <SegmentedControlItem value="left">Left</SegmentedControlItem>
 *       <SegmentedControlItem value="center">Center</SegmentedControlItem>
 *     </FormSegmentedControl>
 *
 * THE GROUP IS NAMED ONCE, by the legend. `SegmentedControl` is handed no `label`
 * here on purpose: two names are announced twice ("Text alignment, group …
 * Text alignment, radio group"), and of the two the visible legend is the one
 * worth keeping — a segmented control in a form with no title is a defect no
 * test catches and every sighted user sees. The `role="radiogroup"` goes with
 * the name it no longer has; the options are grouped by the `<fieldset>` and
 * paired by `name`, which is what the platform actually reads.
 *
 * BOUND PER OPTION, not through the group. This used to bind the field with the
 * per-field port and bend two of its three keys to fit: `onChange` went on the
 * group and worked by delegation (`change` bubbles, so `event.target.value` is
 * the chosen option), and `ref` was dropped outright, because there is no "the
 * input" of a radio group to hand one to. The cost was stated here rather than
 * papered over — a library could not focus this field from an error summary,
 * and a ref-based one could not write a value back into it at all.
 *
 * `UseFormOptionField` is the shape that was missing: the field is bound ONCE
 * here, and each `SegmentedControlItem` asks for its own props through
 * `OptionBindingProvider`. Every radio now carries the binding's `name`,
 * `checked`, `onChange`, `onBlur` and — the part that was impossible — its
 * `ref`. Nothing is delegated and nothing is dropped.
 */
function FormSegmentedControl(props: FormSegmentedControlProps) {
  const { name, label, hint, children, ...rest } = props;
  const binding = useBoundOptionField(name, 'FormSegmentedControl');
  useBindingOwnedWarning(rest, 'FormSegmentedControl');
  const messages = toMessages(binding.errors);

  return (
    <Fieldset invalid={messages.length > 0}>
      <FieldsetLegend>{label}</FieldsetLegend>
      <FieldsetContent>
        <SegmentedControl
          // The group still needs the name — it is what pairs the radios, and
          // what its own dev warning checks. The binding writes it onto every
          // option too; they agree because both come from this one prop.
          name={name}
          {...withoutBindingOwned(rest)}
        >
          {/* The provider sits INSIDE the group so an item reads both: the
              group for what a group knows (that it is a set), this for what
              only the field knows (which option the form holds). */}
          <OptionBindingProvider value={binding}>
            {children}
          </OptionBindingProvider>
        </SegmentedControl>
      </FieldsetContent>
      {hint === undefined ? null : <FieldDescription>{hint}</FieldDescription>}
      {messages.map((message) => (
        <FieldError key={message}>{message}</FieldError>
      ))}
    </Fieldset>
  );
}

export { FormSegmentedControl };

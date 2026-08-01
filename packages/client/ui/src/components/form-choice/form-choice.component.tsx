import { ChoiceField } from '../choice-field/choice-field.component.js';
import { Checkbox } from '../checkbox/checkbox.component.js';
import { FieldDescription } from '../field-description/field-description.component.js';
import { FieldError } from '../field-error/field-error.component.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { useBoundField } from '../../form/form-adapter.context.js';
import {
  useBindingOwnedWarning,
  withoutBindingOwned,
} from '../../form/binding-owned.js';
import { toMessages } from '../../form/messages.js';
import type { FormChoiceProps } from './form-choice.types.js';

/**
 * A single bound choice — a consent box, an opt-in — with the control-first
 * anatomy of `ChoiceField`:
 *
 *     <FormChoice name="tos" label="Accept the terms" />
 *
 * For a GROUP of choices the field is the group, not the option: use a
 * `Fieldset` and bind each option yourself.
 */
function FormChoice(props: FormChoiceProps) {
  const { name, label, hint, ref, ...rest } = props;
  const { control, errors } = useBoundField(name, 'FormChoice');
  useBindingOwnedWarning(rest, 'FormChoice');
  const messages = toMessages(errors);

  return (
    <ChoiceField label={label} invalid={messages.length > 0}>
      {/* Same precedence as `FormInput`: the call site wins on what it may
          pass, and what the binding owns — `checked`, `onChange` — never
          reaches here. */}
      <Checkbox
        {...control}
        {...withoutBindingOwned(rest)}
        ref={mergeRefs(control.ref, ref)}
      />
      {hint === undefined ? null : <FieldDescription>{hint}</FieldDescription>}
      {messages.map((message) => (
        <FieldError key={message}>{message}</FieldError>
      ))}
    </ChoiceField>
  );
}

export { FormChoice };

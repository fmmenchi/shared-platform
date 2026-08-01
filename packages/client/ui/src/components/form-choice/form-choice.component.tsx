import { ChoiceField } from '../choice-field/choice-field.component.js';
import { Checkbox } from '../checkbox/checkbox.component.js';
import { FieldDescription } from '../field-description/field-description.component.js';
import { FieldError } from '../field-error/field-error.component.js';
import { useBoundField } from '../../form/form-adapter.context.js';
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
  const { name, label, hint, ...rest } = props;
  const { control, error } = useBoundField(name, 'FormChoice');
  const messages = toMessages(error);

  return (
    <ChoiceField label={label} invalid={messages.length > 0}>
      <Checkbox {...control} {...rest} />
      {hint === undefined ? null : <FieldDescription>{hint}</FieldDescription>}
      {messages.map(({ key, message }) => (
        <FieldError key={key}>{message}</FieldError>
      ))}
    </ChoiceField>
  );
}

export { FormChoice };

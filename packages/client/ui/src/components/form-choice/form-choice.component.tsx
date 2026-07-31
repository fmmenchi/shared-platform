import { ChoiceField } from '../choice-field/choice-field.component.js';
import { Checkbox } from '../checkbox/checkbox.component.js';
import { useBoundField } from '../../form/form-adapter.context.js';
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

  return (
    <ChoiceField label={label} hint={hint} error={error}>
      <Checkbox {...control} {...rest} />
    </ChoiceField>
  );
}

export { FormChoice };

import { Checkbox, ChoiceField } from '@fmmenchi/ui';
import { useBoundField } from '../shared/use-bound-field.js';
import type { FormChoiceProps } from './form-choice.types.js';

/**
 * A single bound choice — a consent box, an opt-in — with the control-first
 * anatomy of `ChoiceField`, already wired to react-hook-form.
 *
 * For a GROUP of choices the field is the group, not the option: use a
 * `Fieldset` and bind each option yourself.
 */
function FormChoice(props: FormChoiceProps) {
  const { name, label, hint, rules, ...rest } = props;
  const { control, error } = useBoundField(name, rules);

  return (
    <ChoiceField label={label} hint={hint} error={error}>
      <Checkbox {...control} {...rest} />
    </ChoiceField>
  );
}

export { FormChoice };

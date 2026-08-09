import { ChoiceField } from '../choice-field/choice-field.component.js';
import { Switch } from '../switch/switch.component.js';
import { FieldDescription } from '../field-description/field-description.component.js';
import { FieldError } from '../field-error/field-error.component.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { useBoundField } from '../../form/form-adapter.context.js';
import {
  useBindingOwnedWarning,
  withoutBindingOwned,
} from '../../form/binding-owned.js';
import { toMessages } from '../../form/messages.js';
import type { FormSwitchProps } from './form-switch.types.js';

/**
 * A bound setting — notifications on, dark theme on — with the control-first
 * anatomy of `ChoiceField`:
 *
 *     <FormSwitch name="notify" label="Email me about replies" />
 *
 * THE FORM IS THE STATE, NOT THE SUBMIT, and that is worth saying because it
 * is where this component could be misread. ADR-0024 says a switch applies the
 * moment it is flipped, and a switch waiting beside a Save button is a checkbox
 * that has been given the wrong shape. Binding one to a form library does not
 * change that: it is for a settings surface whose library holds the state and
 * persists on change — validation, dirty tracking, one source of truth — not
 * for parking a switch in a form that submits later. If there is a Save button,
 * reach for `FormChoice`.
 *
 * Same precedence as every other adapter here: the call site wins on what it
 * may pass, and what the binding owns — `checked`, `onChange` — is not a prop
 * at all.
 */
function FormSwitch(props: FormSwitchProps) {
  const { name, label, hint, ref, ...rest } = props;
  const { control, errors } = useBoundField(name, 'FormSwitch');
  useBindingOwnedWarning(rest, 'FormSwitch');
  const messages = toMessages(errors);

  return (
    <ChoiceField label={label} invalid={messages.length > 0}>
      <Switch
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

export { FormSwitch };

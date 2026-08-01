import { Field } from '../field/field.component.js';
import { FieldDescription } from '../field-description/field-description.component.js';
import { FieldError } from '../field-error/field-error.component.js';
import { Select } from '../select/select.component.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { useBoundField } from '../../form/form-adapter.context.js';
import {
  useBindingOwnedWarning,
  withoutBindingOwned,
} from '../../form/binding-owned.js';
import { toMessages } from '../../form/messages.js';
import type { FormSelectProps } from './form-select.types.js';

/**
 * A labelled single choice, already bound to the form library in scope:
 *
 *     <FormSelect name="country" label="Country">
 *       <option value="">Choose…</option>
 *       <option value="it">Italy</option>
 *     </FormSelect>
 *
 * The options stay yours — they are content, and a design system that owned
 * them would be owning the app's data. Everything else is `FormInput`'s
 * contract, unchanged: messages as a list, `value`/`onChange` refused, `ref`
 * shared.
 *
 * The tag is declared to the binding (`useBoundField<'select'>`) because the
 * adapter's bag of props is tag-agnostic while its `ref` and handlers are not.
 */
function FormSelect(props: FormSelectProps) {
  const { name, label, hint, children, ref, ...rest } = props;
  const { control, errors } = useBoundField<'select'>(name, 'FormSelect');
  useBindingOwnedWarning(rest, 'FormSelect');
  const messages = toMessages(errors);

  return (
    <Field label={label} invalid={messages.length > 0}>
      <Select
        {...control}
        {...withoutBindingOwned(rest)}
        ref={mergeRefs(control.ref, ref)}
      >
        {children}
      </Select>
      {hint === undefined ? null : <FieldDescription>{hint}</FieldDescription>}
      {messages.map((message) => (
        <FieldError key={message}>{message}</FieldError>
      ))}
    </Field>
  );
}

export { FormSelect };

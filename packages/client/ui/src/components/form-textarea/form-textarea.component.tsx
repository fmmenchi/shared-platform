import { Field } from '../field/field.component.js';
import { FieldDescription } from '../field-description/field-description.component.js';
import { FieldError } from '../field-error/field-error.component.js';
import { Textarea } from '../textarea/textarea.component.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { useBoundField } from '../../form/form-adapter.context.js';
import {
  useBindingOwnedWarning,
  withoutBindingOwned,
} from '../../form/binding-owned.js';
import { toMessages } from '../../form/messages.js';
import type { FormTextareaProps } from './form-textarea.types.js';

/**
 * A labelled multi-line field, already bound to the form library in scope:
 *
 *     <FormTextarea name="notes" label="Notes" rows={4} />
 *
 * `FormInput`'s twin — same anatomy, same contract, same refusals — for text
 * that runs past a line. It is the assembled form of `<Field><Textarea /></Field>`;
 * drop to those when a field needs something this does not express.
 *
 * The tag is declared to the binding (`useBoundField<'textarea'>`) because the
 * adapter's bag of props is tag-agnostic while its `ref` and handlers are not:
 * the component that renders the element is the one that knows which it is.
 */
function FormTextarea(props: FormTextareaProps) {
  const { name, label, hint, ref, ...rest } = props;
  const { control, errors } = useBoundField<'textarea'>(name, 'FormTextarea');
  useBindingOwnedWarning(rest, 'FormTextarea');
  const messages = toMessages(errors);

  return (
    <Field label={label} invalid={messages.length > 0}>
      <Textarea
        {...control}
        {...withoutBindingOwned(rest)}
        ref={mergeRefs(control.ref, ref)}
      />
      {hint === undefined ? null : <FieldDescription>{hint}</FieldDescription>}
      {messages.map((message) => (
        <FieldError key={message}>{message}</FieldError>
      ))}
    </Field>
  );
}

export { FormTextarea };

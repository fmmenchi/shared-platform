import { Field } from '../field/field.component.js';
import { Input } from '../input/input.component.js';
import { useBoundField } from '../../form/form-adapter.context.js';
import type { FormInputProps } from './form-input.types.js';

/**
 * A labelled text field, already bound to the form library in scope:
 *
 *     <FormAdapterProvider adapter={useMyAdapter()}>
 *       <FormInput name="email" label="Email" />
 *     </FormAdapterProvider>
 *
 * One tag per field, and nothing below the provider names a form library —
 * swapping one is a single line, in a single place.
 *
 * It is the assembled form of `<Field><Input /></Field>`; drop to those when a
 * field needs something this does not express, and the two stay interchangeable
 * because this adds no markup of its own.
 */
function FormInput(props: FormInputProps) {
  const { name, label, hint, ...rest } = props;
  const { control, error } = useBoundField(name, 'FormInput');

  return (
    <Field label={label} hint={hint} error={error}>
      {/* The adapter's props come FIRST so an explicit prop at the call site
          still wins — a per-field `placeholder` or `type` must not be erased by
          the binding. */}
      <Input {...control} {...rest} />
    </Field>
  );
}

export { FormInput };

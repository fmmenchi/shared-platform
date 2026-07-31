import { Field, Input } from '@fmmenchi/ui';
import { useBoundField } from '../shared/use-bound-field.js';
import type { FormInputProps } from './form-input.types.js';

/**
 * A labelled text field, already bound to the react-hook-form instance in
 * scope:
 *
 *     <FormProvider {...form}>
 *       <FormInput name="email" label="Email" />
 *     </FormProvider>
 *
 * It is `<Field><Input /></Field>` with the binding done — no adapter, no
 * provider of ours, nothing to configure. Drop to the design system's own
 * components when a field needs something this does not express; they compose
 * identically, because this adds no markup.
 */
function FormInput(props: FormInputProps) {
  const { name, label, hint, rules, ...rest } = props;
  const { control, error } = useBoundField(name, rules);

  return (
    <Field label={label} hint={hint} error={error}>
      {/* Binding first, so an explicit prop at the call site still wins. */}
      <Input {...control} {...rest} />
    </Field>
  );
}

export { FormInput };

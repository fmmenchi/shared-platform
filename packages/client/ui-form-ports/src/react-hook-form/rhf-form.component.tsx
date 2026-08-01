import { FormProvider, useForm, type FieldValues } from 'react-hook-form';
import { Form } from '@fmmenchi/ui';
import type { RhfFormProps } from './rhf-form.types.js';

/**
 * A whole form, wired: the react-hook-form instance, its provider, the
 * `<form>` element and its submit handler.
 *
 *     <RhfForm
 *       options={{ defaultValues, resolver: zodResolver(SignupSchema) }}
 *       onSubmit={save}
 *     >
 *       <FormInput name="email" label="Email" />
 *       <FormSubmit>Create account</FormSubmit>
 *     </RhfForm>
 *
 * It exists so the four lines every form repeats are written once. It hides
 * nothing: `options` is react-hook-form's own `useForm` argument, forwarded
 * whole — `mode`, `criteriaMode`, `values`, any resolver — and the instance is
 * reachable from any child through the library's own `useFormContext()`, since
 * the provider is right here. No render prop, no escape hatch of our invention.
 *
 * What it does NOT do is decide anything: no schema library is assumed, no
 * validation rule is added, and submission stays yours.
 */
function RhfForm<T extends FieldValues>(props: RhfFormProps<T>) {
  const { options, onSubmit, children, ...rest } = props;
  const form = useForm<T>(options);

  return (
    <FormProvider {...form}>
      {/* the design system's Form: one <form>, noValidate, adapter scope */}
      <Form onSubmit={form.handleSubmit(onSubmit)} {...rest}>
        {children}
      </Form>
    </FormProvider>
  );
}

export { RhfForm };

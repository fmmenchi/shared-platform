import { FormProvider, useForm, type FieldValues } from 'react-hook-form';
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
      {/*
        `noValidate` belongs HERE and not in the design system. Turning the
        browser's own validation off is a VALIDATION decision, and the design
        system does not make those (ADR-0013) — but by reaching for this
        component you have already chosen react-hook-form to do the validating,
        so the decision is justified by the context.

        It matters: with the browser's validation left on, a `required` field
        blocks submission before `handleSubmit` ever runs — measured, zero calls
        — and shows an unstyleable bubble beside the FieldError. Pass
        `noValidate={false}` to keep the native behaviour anyway.
      */}
      <form noValidate onSubmit={form.handleSubmit(onSubmit)} {...rest}>
        {children}
      </form>
    </FormProvider>
  );
}

export { RhfForm };

import {
  useForm,
  FormProvider,
  useFormContext,
  useFormState,
  type Resolver,
} from 'react-hook-form';
import type { ReactNode } from 'react';
import type { UseFormField, UseFormErrors } from '@fmmenchi/ui';
import type { SignupValues } from '../screens/signup-fields.js';

/**
 * The whole react-hook-form adapter — twelve lines, and it decides nothing.
 * Validation, submission, values and form state all stay with the library; this
 * only reads them into the shape the design system asks for.
 */
export const useRhfField: UseFormField = (name) => {
  const { register, control } = useFormContext();
  const { errors, touchedFields, isSubmitted } = useFormState({
    control,
    name,
  });
  // one policy for the whole app: stay quiet until visited, or submitted once
  const show = isSubmitted || touchedFields[name] === true;
  return {
    control: register(name),
    error: show ? (errors[name]?.message as string | undefined) : undefined,
  };
};

export const useRhfErrors: UseFormErrors = () => {
  const { control } = useFormContext();
  const { errors } = useFormState({ control });
  return Object.fromEntries(
    Object.entries(errors).map(([name, error]) => [
      name,
      [String(error?.message ?? '')].filter(Boolean),
    ]),
  );
};

/**
 * Puts a react-hook-form instance in scope, with a schema-style resolver.
 *
 * Typed to one concrete shape rather than generically: a generic wrapper spends
 * its time fighting the library's own generics for no gain here, and this is a
 * validation app, not a library.
 */
export function RhfHost(props: {
  defaultValues: SignupValues;
  values?: SignupValues;
  resolver: Resolver<SignupValues>;
  onSubmit: (values: SignupValues) => Promise<void> | void;
  children: ReactNode;
}) {
  const { defaultValues, values, resolver, onSubmit, children } = props;
  const form = useForm<SignupValues>({ defaultValues, values, resolver });
  return (
    <FormProvider {...form}>
      <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
        {children}
      </form>
    </FormProvider>
  );
}

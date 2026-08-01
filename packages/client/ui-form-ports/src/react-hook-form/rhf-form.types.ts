import type { ComponentProps, ReactNode } from 'react';
import type { FieldValues, SubmitHandler, UseFormProps } from 'react-hook-form';

interface RhfFormOwnProps<T extends FieldValues> {
  /**
   * react-hook-form's own `useForm` argument, forwarded whole — `defaultValues`,
   * `values`, `mode`, `criteriaMode`, and any resolver you like. Nothing is
   * filtered, so nothing has to be re-exposed as the library grows.
   */
  options?: UseFormProps<T>;
  /** Called with the parsed values once the library says the form is valid. */
  onSubmit: SubmitHandler<T>;
  children?: ReactNode;
}

/**
 * Every native `<form>` prop, plus the two above. `noValidate` defaults to true
 * here — see the component for why that decision belongs to this package and
 * not to the design system.
 */
export type RhfFormProps<T extends FieldValues> = RhfFormOwnProps<T> &
  Omit<ComponentProps<'form'>, 'onSubmit' | 'children'>;

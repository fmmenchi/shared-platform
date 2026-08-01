import type { ComponentProps, ReactNode } from 'react';
import type { FieldValues, SubmitHandler, UseFormProps } from 'react-hook-form';
import type { Form } from '@fmmenchi/ui';

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
 * Everything `Form` takes, minus the binding props — the binding is this
 * package's job, and is given once to `UiProvider`.
 */
export type RhfFormProps<T extends FieldValues> = RhfFormOwnProps<T> &
  Omit<
    ComponentProps<typeof Form>,
    'onSubmit' | 'children' | 'field' | 'status'
  >;

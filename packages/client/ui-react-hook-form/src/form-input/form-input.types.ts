import type { ComponentProps, ReactNode } from 'react';
import type { RegisterOptions } from 'react-hook-form';
import type { Input } from '@fmmenchi/ui';

interface FormInputOwnProps {
  /** The field name, as react-hook-form knows it. */
  name: string;
  label: ReactNode;
  hint?: ReactNode;
  /**
   * Per-field validation rules, passed straight to `register`. Available HERE,
   * unlike a name-only binding — the reason being that this package knows the
   * library, so it can offer the library's own API at the call site.
   */
  rules?: RegisterOptions;
}

export type FormInputProps = FormInputOwnProps &
  Omit<ComponentProps<typeof Input>, keyof FormInputOwnProps>;

import type { ComponentProps, ReactNode } from 'react';
import type { RegisterOptions } from 'react-hook-form';
import type { Checkbox } from '@fmmenchi/ui';

interface FormChoiceOwnProps {
  /** The field name, as react-hook-form knows it. */
  name: string;
  label: ReactNode;
  hint?: ReactNode;
  /** Per-field validation rules, passed straight to `register`. */
  rules?: RegisterOptions;
}

export type FormChoiceProps = FormChoiceOwnProps &
  Omit<ComponentProps<typeof Checkbox>, keyof FormChoiceOwnProps>;

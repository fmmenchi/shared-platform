import type { ComponentProps, ReactNode } from 'react';
import type { ColorPicker } from '../color-picker/color-picker.component.js';
import type { BindingOwned } from '../../form/binding-owned.types.js';

interface FormColorPickerOwnProps {
  /** The field name, as your form library knows it. */
  name: string;
  label: ReactNode;
  hint?: ReactNode;
}

export type FormColorPickerProps = FormColorPickerOwnProps &
  Omit<
    ComponentProps<typeof ColorPicker>,
    keyof FormColorPickerOwnProps | keyof BindingOwned
  >;

import type { ComponentProps, ReactNode } from 'react';
import type { Checkbox } from '../checkbox/checkbox.component.js';

interface FormChoiceOwnProps {
  /** The field name, as your form library knows it. */
  name: string;
  label: ReactNode;
  hint?: ReactNode;
}

/**
 * A `ChoiceField` + `Checkbox` already bound to the form library in scope — the
 * control-first anatomy, for a consent box or a lone opt-in.
 */
export type FormChoiceProps = FormChoiceOwnProps &
  Omit<ComponentProps<typeof Checkbox>, keyof FormChoiceOwnProps>;

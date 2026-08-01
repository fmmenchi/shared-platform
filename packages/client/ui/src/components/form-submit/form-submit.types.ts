import type { ComponentProps, ReactNode } from 'react';
import type { Button } from '../button/button.component.js';

interface FormSubmitOwnProps {
  children?: ReactNode;
}

/**
 * The form's submit button, which knows when a submission is in flight.
 */
export type FormSubmitProps = FormSubmitOwnProps &
  Omit<ComponentProps<typeof Button>, 'type' | keyof FormSubmitOwnProps>;

import type { ComponentProps, ReactNode } from 'react';
import type { Button } from '../button/button.component.js';

interface FormSubmitOwnProps {
  children?: ReactNode;
  /**
   * Say so yourself, and it wins over both other sources. For an app driving
   * the wait with its own `useTransition`, or anything else the button cannot
   * see.
   */
  isLoading?: boolean;
}

/**
 * The form's submit button, which knows when a submission is in flight.
 */
export type FormSubmitProps = FormSubmitOwnProps &
  Omit<ComponentProps<typeof Button>, 'type' | keyof FormSubmitOwnProps>;

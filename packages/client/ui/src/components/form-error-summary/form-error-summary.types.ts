import type { ComponentPropsWithRef, ReactNode } from 'react';

interface FormErrorSummaryOwnProps {
  /**
   * The heading above the list. Give it something that says what happened —
   * "There is a problem" reads better than "Errors".
   */
  heading?: ReactNode;
  /**
   * Turn a field name into the words a person recognises. Without it the list
   * shows the raw `name`, which is a database column, not a label.
   */
  labelFor?: (name: string) => ReactNode;
}

/**
 * The accessible error summary: after a failed submit, one place that says what
 * went wrong and takes you to each field.
 */
export type FormErrorSummaryProps = FormErrorSummaryOwnProps &
  Omit<ComponentPropsWithRef<'div'>, keyof FormErrorSummaryOwnProps>;

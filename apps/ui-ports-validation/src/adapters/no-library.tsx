import { useState, type ReactNode } from 'react';
import type { UseFormField, UseFormStatus } from '@fmmenchi/ui';

/**
 * The same contract with NO form library: a dozen lines of `useState`.
 *
 * It exists to make the claim falsifiable — if a screen looks or behaves
 * differently between this and react-hook-form, the components are not really
 * agnostic.
 */
export function useHandRolledForm<T extends Record<string, unknown>>(options: {
  initial: T;
  validate: (values: T) => Record<string, string[]>;
  onSubmit: (values: T) => Promise<void> | void;
}) {
  const { initial, validate, onSubmit } = options;
  const [values, setValues] = useState<T>(initial);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const errors = submitted ? validate(values) : {};

  const field: UseFormField = (name) => ({
    control: {
      name,
      onChange: (event) => {
        const el = event.target as HTMLInputElement;
        setValues((v) => ({
          ...v,
          [name]: el.type === 'checkbox' ? el.checked : el.value,
        }));
      },
    },
    error: errors[name],
  });

  const status: UseFormStatus = () => ({ submitting, errors });

  const Host = ({ children }: { children: ReactNode }) => (
    <form
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        setSubmitted(true);
        if (Object.keys(validate(values)).length > 0) return;
        setSubmitting(true);
        await onSubmit(values);
        setSubmitting(false);
      }}
    >
      {children}
    </form>
  );

  return { field, status, Host, values };
}

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  FormAdapterProvider,
  FormErrorSummary,
  FormInput,
  type UseFormField,
  type UseFormErrors,
} from '@fmmenchi/ui';

import {
  useForm,
  FormProvider,
  useFormContext,
  useFormState,
} from 'react-hook-form';

/* ═══════════════════════════════════════════════════════════════════════════
   THE WHOLE ADAPTER for react-hook-form, both levels. It READS; it decides
   nothing. Validation, submit handling, values and form state all stay with
   the library — the design system owns only how they are shown.
   ═══════════════════════════════════════════════════════════════════════════ */

const useRhfField: UseFormField = (name) => {
  const { register, control } = useFormContext();
  const { errors } = useFormState({ control, name });
  return {
    control: register(name),
    error: errors[name]?.message as string | undefined,
  };
};

const useRhfErrors: UseFormErrors = () => {
  const { control } = useFormContext();
  const { errors } = useFormState({ control });
  return Object.fromEntries(
    Object.entries(errors).map(([name, error]) => [
      name,
      [String(error?.message ?? '')].filter(Boolean),
    ]),
  );
};

/* ═══════════════════════════════════════════════════════════════════════════ */

describe('the adapter over a real library — it reads, it does not replace', () => {
  function App({ onValid = vi.fn() }: { onValid?: () => void }) {
    const form = useForm({
      defaultValues: { email: '', password: '' },
      resolver: (values) => {
        const errors: Record<string, { type: string; message: string }> = {};
        if (!values.email)
          errors.email = { type: 'schema', message: 'Email is required.' };
        if (String(values.password).length < 8)
          errors.password = {
            type: 'schema',
            message: 'At least 8 characters.',
          };
        return Object.keys(errors).length > 0
          ? { values: {}, errors }
          : { values, errors: {} };
      },
    });
    return (
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onValid)}>
          <FormAdapterProvider field={useRhfField} errors={useRhfErrors}>
            <FormErrorSummary
              labelFor={(n) =>
                ({ email: 'Email', password: 'Password' })[n] ?? n
              }
            />
            <FormInput name="email" label="Email" />
            <FormInput name="password" label="Password" />
            <button type="submit">Create account</button>
          </FormAdapterProvider>
        </form>
      </FormProvider>
    );
  }

  it('the library validates; the summary shows it and takes focus', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    const summary = await screen.findByRole('group', {
      name: 'There is a problem',
    });
    expect(
      [...summary.querySelectorAll('li')].map((n) => n.textContent),
    ).toEqual([
      'Email: Email is required.',
      'Password: At least 8 characters.',
    ]);
    await waitFor(() => expect(summary).toHaveFocus());
  });

  it('the same errors reach the FIELDS, without being computed twice', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    const email = screen.getByRole('textbox', { name: 'Email' });
    await waitFor(() =>
      expect(email).toHaveAccessibleDescription('Email is required.'),
    );
    expect(email).toHaveAttribute('aria-invalid', 'true');
  });

  it('a summary entry moves focus to the library’s own registered control', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    await screen.findByRole('group');
    await user.click(screen.getByRole('link', { name: /Password:/ }));
    expect(screen.getByRole('textbox', { name: 'Password' })).toHaveFocus();
  });

  it('the summary clears when the library says the form is valid', async () => {
    const user = userEvent.setup();
    const onValid = vi.fn();
    render(<App onValid={onValid} />);
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    await screen.findByRole('group');

    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'a@b.it');
    await user.type(
      screen.getByRole('textbox', { name: 'Password' }),
      'longenough1',
    );
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(onValid).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole('group')).toBeNull());
  });
});

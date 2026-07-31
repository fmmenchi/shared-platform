import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider } from 'react-hook-form';
import { FormInput } from './form-input.component.js';
import { FormChoice } from '../form-choice/form-choice.component.js';

function SignupForm({ onSubmit }: { onSubmit: (v: unknown) => void }) {
  const form = useForm({ defaultValues: { email: '', tos: false } });
  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormInput
          name="email"
          label="Email"
          hint="We’ll never share it."
          rules={{ required: 'Email is required.' }}
        />
        <FormChoice
          name="tos"
          label="Accept the terms"
          rules={{ required: 'You have to accept.' }}
        />
        <button type="submit">Sign up</button>
      </form>
    </FormProvider>
  );
}

describe('the bound components', () => {
  it('bind, collect and submit — one tag per field', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<SignupForm onSubmit={onSubmit} />);

    await user.type(screen.getByRole('textbox', { name: /Email/ }), 'a@b.it');
    await user.click(
      screen.getByRole('checkbox', { name: 'Accept the terms' }),
    );
    await user.click(screen.getByRole('button', { name: 'Sign up' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      email: 'a@b.it',
      tos: true,
    });
  });

  it('carries the error to the eye AND to assistive tech', async () => {
    // The subscription subtlety this package exists to have solved: reading
    // `formState` off the context does NOT reach a nested component, so the
    // error would never arrive. `useFormState({ control, name })` does — and
    // subscribes per field, so one error does not re-render the whole form.
    const user = userEvent.setup();
    render(<SignupForm onSubmit={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Sign up' }));

    const input = screen.getByRole('textbox', { name: /Email/ });
    await waitFor(() => expect(input).toHaveAttribute('aria-invalid', 'true'));
    await waitFor(() =>
      expect(input).toHaveAccessibleDescription(/Email is required\./),
    );

    const box = screen.getByRole('checkbox', { name: 'Accept the terms' });
    await waitFor(() =>
      expect(box).toHaveAccessibleDescription('You have to accept.'),
    );
  });

  it('takes per-field rules at the CALL SITE — the thing a name-only port cannot', async () => {
    // The trade this variant makes: it knows the library, so it can offer the
    // library's own API where the field is written.
    const user = userEvent.setup();
    render(<SignupForm onSubmit={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Sign up' }));
    await waitFor(() =>
      expect(screen.getByText('Email is required.')).toBeInTheDocument(),
    );
  });

  it('an explicit prop at the call site still beats the binding', () => {
    function Host() {
      const form = useForm({ defaultValues: { email: '' } });
      return (
        <FormProvider {...form}>
          <FormInput
            name="email"
            label="Email"
            type="email"
            placeholder="you@x"
          />
        </FormProvider>
      );
    }
    render(<Host />);
    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('placeholder', 'you@x');
  });
});

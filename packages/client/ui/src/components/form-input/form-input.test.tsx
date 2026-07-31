import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  useForm,
  FormProvider,
  useFormContext,
  useFormState,
  type RegisterOptions,
} from 'react-hook-form';
import { FormInput } from './form-input.component.js';
import { FormChoice } from '../form-choice/form-choice.component.js';
import { FormAdapterProvider } from '../../form/form-adapter-provider.component.js';
import type { UseFormField } from '../../form/form-adapter.types.js';

/**
 * The app-side adapter, once per library — react-hook-form here. It is a HOOK,
 * and is called inside each bound field, so every field subscribes for itself.
 *
 * NOTE the rules map. The port binds by NAME alone, so a per-field rule cannot
 * live at the call site: validation comes from the adapter — a schema, or a map
 * like this. That is a real constraint of this shape, written out rather than
 * smoothed over.
 */
const RULES: Record<string, RegisterOptions> = {
  email: { required: 'Email is required.' },
};

const useRhfField: UseFormField = (name) => {
  const { register, control } = useFormContext();
  // Per-FIELD subscription: one field's error does not re-render the others.
  const { errors } = useFormState({ control, name });
  return {
    control: register(name, RULES[name]),
    error: errors[name]?.message as string | undefined,
  };
};

function RhfForm({ onSubmit }: { onSubmit: (v: unknown) => void }) {
  const form = useForm({ defaultValues: { email: '', tos: false } });
  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Bound />
        <button type="submit">Send</button>
      </form>
    </FormProvider>
  );
}
function Bound() {
  return (
    <FormAdapterProvider adapter={useRhfField}>
      <FormInput name="email" label="Email" hint="We’ll never share it." />
      <FormChoice name="tos" label="Accept the terms" />
    </FormAdapterProvider>
  );
}

describe('FormInput / FormChoice through the adapter port', () => {
  it('binds and submits, with the call site naming no library', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<RhfForm onSubmit={onSubmit} />);

    await user.type(screen.getByRole('textbox', { name: /Email/ }), 'a@b.it');
    await user.click(
      screen.getByRole('checkbox', { name: 'Accept the terms' }),
    );
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      email: 'a@b.it',
      tos: true,
    });
  });

  // THE regression test for why the adapter is a hook. With a closure in
  // context this failed: the React Compiler cached the provider — react-hook-form
  // mutates its `errors` object in place, so the closure's dependencies looked
  // unchanged — and the error never arrived, silently. Measured, both ways.
  it('carries the library’s error to the eye AND to assistive tech', async () => {
    function Validated() {
      const form = useForm({ defaultValues: { email: '' } });
      return (
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(() => undefined)}>
            <FormAdapterProvider adapter={useRhfField}>
              <FormInput name="email" label="Email" />
            </FormAdapterProvider>
            <button type="submit">Go</button>
          </form>
        </FormProvider>
      );
    }
    // The rule lives with the library — and, under this shape, with the ADAPTER
    // rather than the call site.
    const user = userEvent.setup();
    render(<Validated />);
    const input = screen.getByRole('textbox', { name: 'Email' });
    await user.click(screen.getByRole('button', { name: 'Go' }));
    await waitFor(() => expect(input).toHaveAttribute('aria-invalid', 'true'));
    await waitFor(() =>
      expect(input).toHaveAccessibleDescription('Email is required.'),
    );
  });

  it('the SAME components work with no form library at all', async () => {
    // The port's whole claim: swapping the library is one line, and nothing
    // below the provider notices.
    const user = userEvent.setup();

    function Plain() {
      const [v, setV] = useState<Record<string, string | boolean>>({
        email: '',
        tos: false,
      });
      const adapter: UseFormField = (name) => ({
        control: {
          name,
          onChange: (e) => {
            const el = e.target as HTMLInputElement;
            setV({
              ...v,
              [name]: el.type === 'checkbox' ? el.checked : el.value,
            });
          },
        },
        error:
          name === 'email' && v.email === '' ? 'Email is required.' : undefined,
      });
      return (
        <>
          <output>{JSON.stringify(v)}</output>
          <FormAdapterProvider adapter={adapter}>
            <FormInput name="email" label="Email" />
            <FormChoice name="tos" label="Accept the terms" />
          </FormAdapterProvider>
        </>
      );
    }

    render(<Plain />);
    const input = screen.getByRole('textbox', { name: 'Email' });
    await waitFor(() =>
      expect(input).toHaveAccessibleDescription('Email is required.'),
    );

    await user.type(input, 'a@b.it');
    await user.click(
      screen.getByRole('checkbox', { name: 'Accept the terms' }),
    );
    expect(
      JSON.parse(screen.getByRole('status').textContent ?? '{}'),
    ).toMatchObject({
      email: 'a@b.it',
      tos: true,
    });
    expect(screen.getByRole('textbox', { name: 'Email' })).not.toHaveAttribute(
      'aria-invalid',
    );
  });

  it('an explicit prop at the call site still beats the binding', async () => {
    const adapter: UseFormField = (name) => ({ control: { name } });
    render(
      <FormAdapterProvider adapter={adapter}>
        <FormInput
          name="email"
          label="Email"
          type="email"
          placeholder="you@x"
        />
      </FormAdapterProvider>,
    );
    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('placeholder', 'you@x');
  });

  it('throws by name when there is no adapter in scope', () => {
    // Silently unbound is worse: it renders, it types, and it submits nothing.
    const error = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    expect(() => render(<FormInput name="email" label="Email" />)).toThrow(
      /FormInput: no form adapter in scope/,
    );
    error.mockRestore();
  });
});

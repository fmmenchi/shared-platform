import { describe, it, expect, vi } from 'vitest';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  useForm,
  FormProvider,
  useFormContext,
  useFormState,
} from 'react-hook-form';
import { Field } from '../components/field/field.component.js';
import { ChoiceField } from '../components/choice-field/choice-field.component.js';
import { Input } from '../components/input/input.component.js';
import { Checkbox } from '../components/checkbox/checkbox.component.js';

/* ═══════════════════════════════════════════════════════════════════════════
   THE RECIPES, executed rather than described. Everything below would live in
   an APP: the design system ships nothing for this, which is the whole point
   of the variant. If these break, the page in Guidelines is wrong.
   ═══════════════════════════════════════════════════════════════════════════ */

interface Bound {
  // `size` omitted: on `Input` that name is the design system's SIZING axis
  // (sm/md/lg), so the native numeric attribute would not typecheck — and,
  // worse, would silently mean something else.
  control: Omit<ComponentProps<'input'>, 'size'>;
  error?: string;
}
type Adapter = (name: string) => Bound;

/* ── recipe 2: one component per anatomy, written once against that shape ──── */

function FormInput({
  bind,
  name,
  label,
  hint,
  ...rest
}: {
  bind: Adapter;
  name: string;
  label: ReactNode;
  hint?: ReactNode;
} & Omit<ComponentProps<typeof Input>, 'name'>) {
  const { control, error } = bind(name);
  return (
    <Field label={label} hint={hint} error={error}>
      {/* binding first, so an explicit prop at the call site still wins */}
      <Input {...control} {...rest} />
    </Field>
  );
}

function FormChoice({
  bind,
  name,
  label,
}: {
  bind: Adapter;
  name: string;
  label: ReactNode;
}) {
  const { control, error } = bind(name);
  return (
    <ChoiceField label={label} error={error}>
      <Checkbox {...control} />
    </ChoiceField>
  );
}

/* ── recipe 1: the adapter hook, one per library ───────────────────────────── */

function useRhfAdapter(): Adapter {
  const { register, control } = useFormContext();
  // `useFormState`, not `formState` off the context: the Proxy subscription
  // does not reach a nested component, so the error would never arrive.
  const { errors } = useFormState({ control });
  return (name) => ({
    control: register(name),
    error: errors[name]?.message as string | undefined,
  });
}

describe('the recipes in Guidelines → Wiring a form library', () => {
  it('recipe: react-hook-form', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    function Fields() {
      const bind = useRhfAdapter();
      return (
        <>
          <FormInput bind={bind} name="email" label="Email" />
          <FormChoice bind={bind} name="tos" label="Accept" />
        </>
      );
    }
    function Form() {
      const form = useForm({ defaultValues: { email: '', tos: false } });
      return (
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Fields />
            <button type="submit">Send</button>
          </form>
        </FormProvider>
      );
    }

    render(<Form />);
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'a@b.it');
    await user.click(screen.getByRole('checkbox', { name: 'Accept' }));
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      email: 'a@b.it',
      tos: true,
    });
  });

  it('recipe: no form library at all — the components cannot tell', async () => {
    const user = userEvent.setup();

    function Form() {
      const [values, setValues] = useState<Record<string, string | boolean>>({
        email: '',
        tos: false,
      });
      const bind: Adapter = (name) => ({
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
        error:
          name === 'email' && values.email === ''
            ? 'Email is required.'
            : undefined,
      });
      return (
        <>
          <output>{JSON.stringify(values)}</output>
          <FormInput bind={bind} name="email" label="Email" />
          <FormChoice bind={bind} name="tos" label="Accept" />
        </>
      );
    }

    render(<Form />);
    const input = screen.getByRole('textbox', { name: 'Email' });
    // the "library"'s error is already on screen and on the a11y tree
    await waitFor(() =>
      expect(input).toHaveAccessibleDescription('Email is required.'),
    );

    await user.type(input, 'a@b.it');
    await user.click(screen.getByRole('checkbox', { name: 'Accept' }));
    expect(
      JSON.parse(screen.getByRole('status').textContent ?? '{}'),
    ).toMatchObject({ email: 'a@b.it', tos: true });
    // and it cleared itself, because it was derived
    expect(screen.getByRole('textbox', { name: 'Email' })).not.toHaveAttribute(
      'aria-invalid',
    );
  });
});

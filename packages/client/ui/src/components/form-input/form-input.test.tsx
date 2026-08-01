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
  type Resolver,
} from 'react-hook-form';
import { FormInput } from './form-input.component.js';
import { FormChoice } from '../form-choice/form-choice.component.js';
import { FormAdapterProvider } from '../../form/form-adapter-provider.component.js';
import type {
  BoundField,
  UseFormField,
} from '../../form/form-adapter.types.js';

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
    <FormAdapterProvider field={useRhfField}>
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
            <FormAdapterProvider field={useRhfField}>
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
          <FormAdapterProvider field={adapter}>
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
      <FormAdapterProvider field={adapter}>
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

  // What the small contract can and cannot carry. Complex validation is not a
  // problem for it: cross-field and async rules live in the library's schema and
  // surface BY NAME, which is all this shape transports.
  describe('complex validation', () => {
    it('carries a CROSS-FIELD rule — the message arrives by name like any other', async () => {
      const useConfirm: UseFormField = (name) => {
        const { register, control, getValues } = useFormContext();
        const { errors } = useFormState({ control, name });
        return {
          control: register(name, {
            validate:
              name === 'confirm'
                ? (v) =>
                    v === getValues('password') || 'Passwords do not match.'
                : undefined,
          }),
          error: errors[name]?.message as string | undefined,
        };
      };
      function Host() {
        const form = useForm({ defaultValues: { password: '', confirm: '' } });
        return (
          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(() => undefined)}>
              <FormAdapterProvider field={useConfirm}>
                <FormInput name="password" label="Password" />
                <FormInput name="confirm" label="Confirm" />
              </FormAdapterProvider>
              <button type="submit">Go</button>
            </form>
          </FormProvider>
        );
      }
      const user = userEvent.setup();
      render(<Host />);
      await user.type(screen.getByRole('textbox', { name: 'Password' }), 'abc');
      await user.type(screen.getByRole('textbox', { name: 'Confirm' }), 'xyz');
      await user.click(screen.getByRole('button', { name: 'Go' }));

      const confirm = screen.getByRole('textbox', { name: 'Confirm' });
      await waitFor(() =>
        expect(confirm).toHaveAccessibleDescription('Passwords do not match.'),
      );
      // and only that field is marked
      expect(
        screen.getByRole('textbox', { name: 'Password' }),
      ).not.toHaveAttribute('aria-invalid');
    });

    it('lets the adapter decide WHEN to show a message — e.g. only once touched', async () => {
      // The contract carries no `touched`, and does not need to: gating is the
      // adapter's decision, which keeps the shape small without losing the case.
      const useTouchedOnly: UseFormField = (name) => {
        const { register, control } = useFormContext();
        const { errors, touchedFields } = useFormState({ control, name });
        return {
          control: register(name, { required: 'Email is required.' }),
          error: touchedFields[name]
            ? (errors[name]?.message as string | undefined)
            : undefined,
        };
      };
      function Host() {
        const form = useForm({
          defaultValues: { email: '' },
          mode: 'onBlur',
        });
        return (
          <FormProvider {...form}>
            <FormAdapterProvider field={useTouchedOnly}>
              <FormInput name="email" label="Email" />
            </FormAdapterProvider>
          </FormProvider>
        );
      }
      const user = userEvent.setup();
      render(<Host />);
      const input = screen.getByRole('textbox', { name: 'Email' });
      // empty and invalid, but untouched: silent
      expect(input).not.toHaveAttribute('aria-invalid');

      await user.click(input);
      await user.tab();
      await waitFor(() =>
        expect(input).toHaveAccessibleDescription('Email is required.'),
      );
    });
  });

  it('ONE adapter holds the whole policy — rules, cross-field, when to show', async () => {
    // What an app actually writes: a single adapter, a single rules map, and a
    // single decision about when a message is allowed to appear. It dispatches
    // on `name`, which is why binding by name is enough.
    const RULES: Record<string, RegisterOptions> = {
      email: { required: 'Email is required.' },
      password: { minLength: { value: 8, message: 'At least 8 characters.' } },
      confirm: {
        validate: (v, all) =>
          v === (all as { password: string }).password ||
          'Passwords do not match.',
      },
    };

    const useAppField: UseFormField = (name) => {
      const { register, control } = useFormContext();
      const { errors, touchedFields, isSubmitted } = useFormState({
        control,
        name,
      });
      // one policy for the whole form: stay quiet until the field is touched
      // or the form has been submitted once.
      const show = isSubmitted || touchedFields[name] === true;
      return {
        control: register(name, RULES[name]),
        error: show ? (errors[name]?.message as string | undefined) : undefined,
      };
    };

    function App() {
      const form = useForm({
        defaultValues: { email: '', password: '', confirm: '' },
        mode: 'onBlur',
      });
      return (
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(() => undefined)}>
            <FormAdapterProvider field={useAppField}>
              <FormInput name="email" label="Email" />
              <FormInput name="password" label="Password" />
              <FormInput name="confirm" label="Confirm password" />
            </FormAdapterProvider>
            <button type="submit">Create account</button>
          </form>
        </FormProvider>
      );
    }

    const user = userEvent.setup();
    render(<App />);
    const email = screen.getByRole('textbox', { name: 'Email' });
    const password = screen.getByRole('textbox', { name: 'Password' });
    const confirm = screen.getByRole('textbox', { name: 'Confirm password' });

    // nothing shouts before the user has done anything
    expect(email).not.toHaveAttribute('aria-invalid');

    await user.type(password, 'short');
    await user.type(confirm, 'different');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    // a per-field rule, a cross-field rule and a required, all from one adapter
    await waitFor(() =>
      expect(password).toHaveAccessibleDescription('At least 8 characters.'),
    );
    await waitFor(() =>
      expect(confirm).toHaveAccessibleDescription('Passwords do not match.'),
    );
    await waitFor(() =>
      expect(email).toHaveAccessibleDescription('Email is required.'),
    );
  });

  it('is unchanged by a SCHEMA resolver — zod, valibot, yup', async () => {
    // The question this answers: with zod you pass a `resolver` to useForm and
    // never write a per-field rule, so the one thing this shape cannot do stops
    // mattering. The adapter below has NO rules map at all and is otherwise
    // identical — errors still arrive by name.
    //
    // The resolver is hand-written rather than imported: `zodResolver` is just a
    // function of this shape, so the mechanism is proved without the dependency.
    type Values = { email: string; password: string };
    const schemaResolver: Resolver<Values> = (values) => {
      const errors: Record<string, { type: string; message: string }> = {};
      if (!values.email) {
        errors.email = { type: 'schema', message: 'Email is required.' };
      }
      if (String(values.password ?? '').length < 8) {
        errors.password = { type: 'schema', message: 'At least 8 characters.' };
      }
      return Object.keys(errors).length > 0
        ? { values: {}, errors }
        : { values, errors: {} };
    };

    // Note what is NOT here: no rules, no register options. Just the binding.
    const useSchemaField: UseFormField = (name) => {
      const { register, control } = useFormContext();
      const { errors } = useFormState({ control, name });
      return {
        control: register(name),
        error: errors[name]?.message as string | undefined,
      };
    };

    function App() {
      const form = useForm({
        defaultValues: { email: '', password: '' },
        resolver: schemaResolver,
      });
      return (
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(() => undefined)}>
            <FormAdapterProvider field={useSchemaField}>
              <FormInput name="email" label="Email" />
              <FormInput name="password" label="Password" />
            </FormAdapterProvider>
            <button type="submit">Go</button>
          </form>
        </FormProvider>
      );
    }

    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Go' }));

    await waitFor(() =>
      expect(
        screen.getByRole('textbox', { name: 'Email' }),
      ).toHaveAccessibleDescription('Email is required.'),
    );
    await waitFor(() =>
      expect(
        screen.getByRole('textbox', { name: 'Password' }),
      ).toHaveAccessibleDescription('At least 8 characters.'),
    );
  });

  // A field rarely fails in exactly one way, so the contract takes the three
  // shapes libraries actually produce — and each message renders as its OWN
  // element rather than being joined into one run-on sentence.
  describe('several messages at once', () => {
    const renderWith = (error: BoundField['error']) => {
      const adapter: UseFormField = (name) => ({ control: { name }, error });
      return render(
        <FormAdapterProvider field={adapter}>
          <FormInput name="email" label="Email" />
        </FormAdapterProvider>,
      );
    };

    it('a lone string', async () => {
      renderWith('Email is required.');
      const input = screen.getByRole('textbox', { name: 'Email' });
      await waitFor(() =>
        expect(input).toHaveAccessibleDescription('Email is required.'),
      );
    });

    it('an ARRAY — Conform’s shape — as separate elements, not joined', () => {
      const { container } = renderWith(['Too short.', 'Needs a digit.']);
      const errors = [...container.querySelectorAll('p')].map(
        (n) => n.textContent,
      );
      // Two elements, not one string. Joined, a screen reader would read
      // "Too short.Needs a digit." as a single run-on statement.
      expect(errors).toEqual(['Too short.', 'Needs a digit.']);
    });

    it('a KEYED OBJECT — react-hook-form’s criteriaMode: all', () => {
      const { container } = renderWith({
        minLength: 'At least 8 characters.',
        pattern: 'Must contain a digit.',
      });
      expect(
        [...container.querySelectorAll('p')].map((n) => n.textContent),
      ).toEqual(['At least 8 characters.', 'Must contain a digit.']);
    });

    it('announces every message, in order', async () => {
      renderWith(['Too short.', 'Needs a digit.']);
      const input = screen.getByRole('textbox', { name: 'Email' });
      await waitFor(() =>
        expect(input).toHaveAccessibleDescription('Too short. Needs a digit.'),
      );
    });

    it('the hint still comes BEFORE the errors, however many', async () => {
      const adapter: UseFormField = () => ({
        control: { name: 'email' },
        error: ['A.', 'B.'],
      });
      render(
        <FormAdapterProvider field={adapter}>
          <FormInput name="email" label="Email" hint="Work address." />
        </FormAdapterProvider>,
      );
      const input = screen.getByRole('textbox', { name: 'Email' });
      await waitFor(() =>
        expect(input).toHaveAccessibleDescription('Work address. A. B.'),
      );
    });

    it('empty shapes mean valid — no element, no aria-invalid', () => {
      for (const empty of [undefined, '', [], {}] as const) {
        const { container, unmount } = renderWith(empty);
        expect(container.querySelectorAll('p')).toHaveLength(0);
        expect(container.querySelector('input')).not.toHaveAttribute(
          'aria-invalid',
        );
        unmount();
      }
    });
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

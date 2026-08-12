import { describe, it, expect, vi } from 'vitest';
import { createRef, useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import {
  UiProvider,
  FormChoice,
  FormInput,
  type BoundField,
  type UseFormField,
} from '@fmmenchi/ui';
import {
  useForm,
  FormProvider,
  useFormContext,
  useFormState,
  type RegisterOptions,
  type Resolver,
} from 'react-hook-form';
import { useRhfField as useRhfPortField } from '@fmmenchi/ui-form-ports/react-hook-form';

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

/** The port carries a LIST of messages; react-hook-form reports one. */
const list = (message: unknown): string[] =>
  typeof message === 'string' && message !== '' ? [message] : [];

const useRhfField: UseFormField = (name) => {
  const { register, control } = useFormContext();
  // Per-FIELD subscription: one field's error does not re-render the others.
  const { errors } = useFormState({ control, name });
  return {
    control: register(name, RULES[name]),
    errors: list(errors[name]?.message),
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
    <UiProvider
      adapters={{ i18n: { locale: 'en' }, form: { field: useRhfField } }}
    >
      <FormInput name="email" label="Email" hint="We’ll never share it." />
      <FormChoice name="tos" label="Accept the terms" />
    </UiProvider>
  );
}

describe('FormInput / FormChoice through the adapter port', () => {
  it('binds and submits, with the call site naming no library', async () => {
    const onSubmit = vi.fn();
    render(<RhfForm onSubmit={onSubmit} />);

    await browser.type(
      screen.getByRole('textbox', { name: /Email/ }),
      'a@b.it',
    );
    await browser.click(
      screen.getByRole('checkbox', { name: 'Accept the terms' }),
    );
    await browser.click(screen.getByRole('button', { name: 'Send' }));

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
            <UiProvider
              adapters={{
                i18n: { locale: 'en' },
                form: { field: useRhfField },
              }}
            >
              <FormInput name="email" label="Email" />
            </UiProvider>
            <button type="submit">Go</button>
          </form>
        </FormProvider>
      );
    }
    // The rule lives with the library — and, under this shape, with the ADAPTER
    // rather than the call site.
    render(<Validated />);
    const input = screen.getByRole('textbox', { name: 'Email' });
    await browser.click(screen.getByRole('button', { name: 'Go' }));
    await waitFor(() => expect(input).toHaveAttribute('aria-invalid', 'true'));
    await waitFor(() =>
      expect(input).toHaveAccessibleDescription('Email is required.'),
    );
  });

  it('the SAME components work with no form library at all', async () => {
    // The port's whole claim: swapping the library is one line, and nothing
    // below the provider notices.

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
        errors:
          name === 'email' && v.email === '' ? ['Email is required.'] : [],
      });
      return (
        <>
          <output>{JSON.stringify(v)}</output>
          <UiProvider
            adapters={{ i18n: { locale: 'en' }, form: { field: adapter } }}
          >
            <FormInput name="email" label="Email" />
            <FormChoice name="tos" label="Accept the terms" />
          </UiProvider>
        </>
      );
    }

    render(<Plain />);
    const input = screen.getByRole('textbox', { name: 'Email' });
    await waitFor(() =>
      expect(input).toHaveAccessibleDescription('Email is required.'),
    );

    await browser.type(input, 'a@b.it');
    await browser.click(
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
      <UiProvider
        adapters={{ i18n: { locale: 'en' }, form: { field: adapter } }}
      >
        <FormInput
          name="email"
          label="Email"
          type="email"
          placeholder="you@x"
        />
      </UiProvider>,
    );
    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('placeholder', 'you@x');
  });

  // …but not `value`, and not `onChange`. Against a REAL library this is where
  // the difference bites: `register` returns the handlers and the ref, so a
  // call site that won them would leave the field unregistered — it renders, it
  // types, and it submits nothing, with nothing to say so. The type refuses
  // them; here we prove the runtime does too, and that a ref is still shared.
  it('keeps register’s binding whatever the call site passes — and shares the ref', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const onSubmit = vi.fn();
    const stolen = vi.fn();
    const own = createRef<HTMLInputElement>();
    // What a JavaScript consumer can still do, and TypeScript cannot see.
    const forced = { onChange: stolen, value: 'frozen' } as object;

    function App() {
      const form = useForm({ defaultValues: { email: '' } });
      return (
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <UiProvider
              adapters={{
                i18n: { locale: 'en' },
                form: { field: useRhfField },
              }}
            >
              <FormInput name="email" label="Email" ref={own} {...forced} />
            </UiProvider>
            <button type="submit">Send</button>
          </form>
        </FormProvider>
      );
    }

    render(<App />);
    await browser.type(
      screen.getByRole('textbox', { name: 'Email' }),
      'a@b.it',
    );
    await browser.click(screen.getByRole('button', { name: 'Send' }));

    // the library still owns the value…
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ email: 'a@b.it' });
    expect(stolen).not.toHaveBeenCalled();
    // …the ref, which CAN be shared, reached the call site…
    expect(own.current).toBe(screen.getByRole('textbox', { name: 'Email' }));
    // …and dev said what it dropped, by name.
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('FormInput: `onChange`, `value` are owned'),
    );
    warn.mockRestore();
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
          errors: list(errors[name]?.message),
        };
      };
      function Host() {
        const form = useForm({ defaultValues: { password: '', confirm: '' } });
        return (
          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(() => undefined)}>
              <UiProvider
                adapters={{
                  i18n: { locale: 'en' },
                  form: { field: useConfirm },
                }}
              >
                <FormInput name="password" label="Password" />
                <FormInput name="confirm" label="Confirm" />
              </UiProvider>
              <button type="submit">Go</button>
            </form>
          </FormProvider>
        );
      }
      render(<Host />);
      await browser.type(
        screen.getByRole('textbox', { name: 'Password' }),
        'abc',
      );
      await browser.type(
        screen.getByRole('textbox', { name: 'Confirm' }),
        'xyz',
      );
      await browser.click(screen.getByRole('button', { name: 'Go' }));

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
          errors: touchedFields[name] ? list(errors[name]?.message) : [],
        };
      };
      function Host() {
        const form = useForm({
          defaultValues: { email: '' },
          mode: 'onBlur',
        });
        return (
          <FormProvider {...form}>
            <UiProvider
              adapters={{
                i18n: { locale: 'en' },
                form: { field: useTouchedOnly },
              }}
            >
              <FormInput name="email" label="Email" />
            </UiProvider>
          </FormProvider>
        );
      }
      render(<Host />);
      const input = screen.getByRole('textbox', { name: 'Email' });
      // empty and invalid, but untouched: silent
      expect(input).not.toHaveAttribute('aria-invalid');

      await browser.click(input);
      await browser.tab();
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
        errors: show ? list(errors[name]?.message) : [],
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
            <UiProvider
              adapters={{
                i18n: { locale: 'en' },
                form: { field: useAppField },
              }}
            >
              <FormInput name="email" label="Email" />
              <FormInput name="password" label="Password" />
              <FormInput name="confirm" label="Confirm password" />
            </UiProvider>
            <button type="submit">Create account</button>
          </form>
        </FormProvider>
      );
    }

    render(<App />);
    const email = screen.getByRole('textbox', { name: 'Email' });
    const password = screen.getByRole('textbox', { name: 'Password' });
    const confirm = screen.getByRole('textbox', { name: 'Confirm password' });

    // nothing shouts before the user has done anything
    expect(email).not.toHaveAttribute('aria-invalid');

    await browser.type(password, 'short');
    await browser.type(confirm, 'different');

    // LET THE BLUR LAND FIRST, and this is not tidiness.
    //
    // `mode: 'onBlur'`, so leaving `confirm` is what produces the messages —
    // and clicking the submit button is what leaves it. So the button's own
    // mousedown inserts two error messages ABOVE the button, the page grows,
    // the button moves out from under the pointer, and mouseup lands somewhere
    // else: no click event, no submit. Measured — a second click passes, which
    // is the signature of a first one that was lost.
    //
    // That is a real thing that happens to real people ("I pressed Send and
    // nothing happened"), and no simulated event can ever show it, because a
    // dispatched click has no position to miss with. Here we blur on purpose
    // and wait for the layout to settle before aiming.
    await browser.tab();
    await waitFor(() =>
      expect(confirm).toHaveAccessibleDescription('Passwords do not match.'),
    );
    await browser.click(screen.getByRole('button', { name: 'Create account' }));

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
        errors: list(errors[name]?.message),
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
            <UiProvider
              adapters={{
                i18n: { locale: 'en' },
                form: { field: useSchemaField },
              }}
            >
              <FormInput name="email" label="Email" />
              <FormInput name="password" label="Password" />
            </UiProvider>
            <button type="submit">Go</button>
          </form>
        </FormProvider>
      );
    }

    render(<App />);
    await browser.click(screen.getByRole('button', { name: 'Go' }));

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

  // A field rarely fails in exactly one way, so the port carries a LIST — one
  // shape, whatever the library reports. Normalising into it is the ADAPTER's
  // job, which is the one place that knows which library it is talking to; here
  // that claim is made against the real one.
  describe('several messages at once', () => {
    const renderWith = (errors: BoundField['errors']) => {
      const adapter: UseFormField = (name) => ({ control: { name }, errors });
      return render(
        <UiProvider
          adapters={{ i18n: { locale: 'en' }, form: { field: adapter } }}
        >
          <FormInput name="email" label="Email" />
        </UiProvider>,
      );
    };

    it('renders each as its OWN element, not joined', () => {
      const { container } = renderWith(['Too short.', 'Needs a digit.']);
      const errors = [...container.querySelectorAll('p')].map(
        (n) => n.textContent,
      );
      // Two elements, not one string. Joined, a screen reader would read
      // "Too short.Needs a digit." as a single run-on statement.
      expect(errors).toEqual(['Too short.', 'Needs a digit.']);
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
        errors: ['A.', 'B.'],
      });
      render(
        <UiProvider
          adapters={{ i18n: { locale: 'en' }, form: { field: adapter } }}
        >
          <FormInput name="email" label="Email" hint="Work address." />
        </UiProvider>,
      );
      const input = screen.getByRole('textbox', { name: 'Email' });
      await waitFor(() =>
        expect(input).toHaveAccessibleDescription('Work address. A. B.'),
      );
    });

    it('no messages means valid — no element, no aria-invalid', () => {
      for (const empty of [undefined, [], ['']] as const) {
        const { container, unmount } = renderWith(empty);
        expect(container.querySelectorAll('p')).toHaveLength(0);
        expect(container.querySelector('input')).not.toHaveAttribute(
          'aria-invalid',
        );
        unmount();
      }
    });

    // Where the shipped adapter earns the list. Under `criteriaMode: 'all'`
    // react-hook-form reports one message PER RULE in `error.types`, and
    // reading `error.message` alone shows one of three with nothing to say the
    // rest exist — measured: the field was invalid for two reasons and the user
    // could only see one.
    it('the shipped adapter flattens rhf’s `types` — every failed rule shows', async () => {
      // Hand-written rather than imported: `zodResolver` is a function of this
      // shape, so the mechanism is proved without the dependency. Under
      // `criteriaMode: 'all'` the library keeps every entry of `types`.
      const everyRule: Resolver<{ password: string }> = (values) => {
        const types: Record<string, string> = {};
        if (String(values.password).length < 8)
          types.minLength = 'At least 8 characters.';
        if (!/[0-9]/.test(String(values.password)))
          types.pattern = 'Must contain a digit.';
        const messages = Object.values(types);
        // Collected into a Record rather than built inline: an object literal
        // with an optional key makes the two branches infer as a union that
        // fits neither half of `ResolverResult`.
        const errors: Record<
          string,
          { type: string; types: Record<string, string>; message: string }
        > = {};
        if (messages.length > 0) {
          errors.password = { type: 'validate', types, message: messages[0] };
        }
        return messages.length > 0
          ? { values: {}, errors }
          : { values, errors: {} };
      };

      function App() {
        const form = useForm({
          defaultValues: { password: '' },
          criteriaMode: 'all',
          resolver: everyRule,
        });
        return (
          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(() => undefined)}>
              <UiProvider
                adapters={{
                  i18n: { locale: 'en' },
                  form: { field: useRhfPortField },
                }}
              >
                <FormInput name="password" label="Password" />
              </UiProvider>
              <button type="submit">Go</button>
            </form>
          </FormProvider>
        );
      }
      const { container } = render(<App />);
      await browser.type(
        screen.getByRole('textbox', { name: 'Password' }),
        'ab',
      );
      await browser.click(screen.getByRole('button', { name: 'Go' }));

      await waitFor(() =>
        expect(
          [...container.querySelectorAll('p')].map((n) => n.textContent),
        ).toEqual(['At least 8 characters.', 'Must contain a digit.']),
      );
    });
  });

  it('throws by name when there is no binding in scope', () => {
    // Silently unbound is worse: it renders, it types, and it submits nothing.
    const error = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    expect(() => render(<FormInput name="email" label="Email" />)).toThrow(
      /FormInput: no form binding in scope/,
    );
    error.mockRestore();
  });
});

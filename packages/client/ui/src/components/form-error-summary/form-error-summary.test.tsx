import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormErrorSummary } from './form-error-summary.component.js';
import { FormInput } from '../form-input/form-input.component.js';
import { UiProvider } from '../../i18n/provider.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';
import type {
  UseFormErrors,
  UseFormField,
} from '../../form/form-adapter.types.js';

/** A hand-rolled "library": the point is that both levels are the app's. */
function useDemoForm() {
  const [values, setValues] = useState({ email: '', password: '' });
  const [submitted, setSubmitted] = useState(false);

  const errors: Record<string, string[]> = {};
  if (submitted) {
    if (values.email === '') errors.email = ['Email is required.'];
    if (values.password.length < 8) {
      errors.password = ['At least 8 characters.', 'Must contain a digit.'];
    }
  }

  const field: UseFormField = (name) => ({
    control: {
      name,
      onChange: (e) =>
        setValues((v) => ({
          ...v,
          [name]: (e.target as HTMLInputElement).value,
        })),
    },
    error: errors[name],
  });
  const formErrors: UseFormErrors = () => errors;

  return { field, formErrors, errors, setSubmitted };
}

function DemoForm({ onValid = vi.fn() }: { onValid?: () => void }) {
  const { field, formErrors, errors, setSubmitted } = useDemoForm();
  return (
    <UiProvider
      adapters={{
        i18n: { locale: 'en' },
        form: { field: field, errors: formErrors },
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
          if (Object.keys(errors).length === 0) onValid();
        }}
      >
        <FormErrorSummary
          labelFor={(n) => ({ email: 'Email', password: 'Password' })[n] ?? n}
        />
        <FormInput name="email" label="Email" />
        <FormInput name="password" label="Password" />
        <button type="submit">Create account</button>
      </form>
    </UiProvider>
  );
}

describe('the form level of the adapter', () => {
  it('renders NOTHING while the form is valid', () => {
    render(<DemoForm />);
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('lists every message from every field after a failed submit', async () => {
    const user = userEvent.setup();
    render(<DemoForm />);
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    const summary = await screen.findByRole('region', {
      name: 'There is a problem',
    });
    const items = [...summary.querySelectorAll('li')].map((n) => n.textContent);
    // three messages across two fields — the per-field view can only ever show
    // the one you happen to be standing on.
    expect(items).toEqual([
      'Email: Email is required.',
      'Password: At least 8 characters.',
      'Password: Must contain a digit.',
    ]);
  });

  it('takes focus when it appears, so the failure is announced at once', async () => {
    const user = userEvent.setup();
    render(<DemoForm />);
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() =>
      expect(
        screen.getByRole('region', { name: 'There is a problem' }),
      ).toHaveFocus(),
    );
  });

  it('takes focus again on a second failed submit, so it is never silent', async () => {
    const user = userEvent.setup();
    render(<DemoForm />);
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    const summary = await screen.findByRole('region', {
      name: 'There is a problem',
    });
    await waitFor(() => expect(summary).toHaveFocus());

    // Move away, as a user reading and then retrying would.
    const email = screen.getByRole('textbox', { name: 'Email' });
    await user.click(email);
    expect(email).toHaveFocus();

    // Submit again with the same errors: the COUNT does not change, so nothing
    // in the rendered output does either. Told nothing, a screen-reader user
    // cannot know the form was rejected a second time.
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(summary).toHaveFocus());
  });

  it('does NOT take focus back while the user is typing a fix', async () => {
    const user = userEvent.setup();
    render(<DemoForm />);
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    await screen.findByRole('region', { name: 'There is a problem' });

    // Fixing one field drops the error count — which is not the summary
    // appearing, and must not pull focus out of the input mid-word. It did:
    // with a library that revalidates as you type, the keystrokes after the
    // field became valid went nowhere and the value silently came up short.
    const email = screen.getByRole('textbox', { name: 'Email' });
    await user.click(email);
    await user.type(email, 'someone@example.com');

    expect(email).toHaveFocus();
    expect(email).toHaveValue('someone@example.com');
  });

  it('each entry moves focus to its field — the whole point of the list', async () => {
    const user = userEvent.setup();
    render(<DemoForm />);
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    await screen.findByRole('region');

    await user.click(
      screen.getByRole('link', { name: /Password: At least 8/ }),
    );
    expect(screen.getByRole('textbox', { name: 'Password' })).toHaveFocus();
  });

  it('uses labelFor, because a raw field name is a database column', async () => {
    const user = userEvent.setup();
    render(<DemoForm />);
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    const summary = await screen.findByRole('region');
    expect(summary.textContent).toContain('Email:');
    expect(summary.textContent).not.toContain('email:');
  });

  it('throws by name when the adapter provides no errors hook', () => {
    const error = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const field: UseFormField = (name) => ({ control: { name } });
    expect(() =>
      render(
        <UiProvider
          adapters={{ i18n: { locale: 'en' }, form: { field: field } }}
        >
          <FormErrorSummary />
        </UiProvider>,
      ),
    ).toThrow(/provides no `errors`/);
    error.mockRestore();
  });

  describe('accessibility (axe)', () => {
    for (const { name, theme } of [
      { name: 'light', theme: undefined },
      { name: 'dark', theme: 'dark' },
    ] as const) {
      it(`no violations — summary shown / ${name}`, async () => {
        const user = userEvent.setup();
        const { container } = renderUi(
          <div
            style={{
              background: 'var(--fm-color-background)',
              color: 'var(--fm-color-foreground)',
              padding: '1rem',
            }}
          >
            <DemoForm />
          </div>,
          { theme },
        );
        await user.click(
          screen.getByRole('button', { name: 'Create account' }),
        );
        await screen.findByRole('region');
        await expectNoA11yViolations(container);
      });
    }
  });
});

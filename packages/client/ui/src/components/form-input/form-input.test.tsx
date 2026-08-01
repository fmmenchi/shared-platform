import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormInput } from './form-input.component.js';
import { FormChoice } from '../form-choice/form-choice.component.js';
import { UiProvider } from '../../i18n/provider.js';
import type {
  BoundField,
  UseFormField,
} from '../../form/form-adapter.types.js';

/**
 * The design system tests the CONTRACT, with a hand-written adapter and no form
 * library at all — which is also the strongest statement of what the contract
 * is. That the contract holds against real libraries is proved next door, in
 * `ui-ports-validation`, where those libraries are installed.
 */
describe('the bound components, against the contract itself', () => {
  it('binds a control and shows nothing when there is no error', () => {
    const field: UseFormField = (name) => ({ control: { name } });
    render(
      <UiProvider adapters={{ i18n: { locale: 'en' }, form: { field: field } }}>
        <FormInput name="email" label="Email" />
      </UiProvider>,
    );
    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(input).toHaveAttribute('name', 'email');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('collects what the user types, through the adapter’s own onChange', async () => {
    const user = userEvent.setup();
    function Host() {
      const [values, setValues] = useState<Record<string, string | boolean>>({
        email: '',
        tos: false,
      });
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
      });
      return (
        <>
          <output>{JSON.stringify(values)}</output>
          <UiProvider
            adapters={{ i18n: { locale: 'en' }, form: { field: field } }}
          >
            <FormInput name="email" label="Email" />
            <FormChoice name="tos" label="Accept" />
          </UiProvider>
        </>
      );
    }
    render(<Host />);
    await user.type(screen.getByRole('textbox', { name: 'Email' }), 'a@b.it');
    await user.click(screen.getByRole('checkbox', { name: 'Accept' }));
    expect(
      JSON.parse(screen.getByRole('status').textContent ?? '{}'),
    ).toMatchObject({ email: 'a@b.it', tos: true });
  });

  it('an explicit prop at the call site beats the binding', () => {
    const field: UseFormField = (name) => ({ control: { name } });
    render(
      <UiProvider adapters={{ i18n: { locale: 'en' }, form: { field: field } }}>
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

  // A field rarely fails in exactly one way, so the contract takes the three
  // shapes libraries produce — and each message renders as its OWN element.
  describe('several messages at once', () => {
    const renderWith = (error: BoundField['error']) => {
      const field: UseFormField = (name) => ({ control: { name }, error });
      return render(
        <UiProvider
          adapters={{ i18n: { locale: 'en' }, form: { field: field } }}
        >
          <FormInput name="email" label="Email" />
        </UiProvider>,
      );
    };

    it('a lone string', async () => {
      renderWith('Email is required.');
      await waitFor(() =>
        expect(
          screen.getByRole('textbox', { name: 'Email' }),
        ).toHaveAccessibleDescription('Email is required.'),
      );
    });

    it('an ARRAY — Conform’s shape — as separate elements, not joined', () => {
      const { container } = renderWith(['Too short.', 'Needs a digit.']);
      // Joined, a screen reader would read "Too short.Needs a digit." as one
      // run-on statement.
      expect(
        [...container.querySelectorAll('p')].map((n) => n.textContent),
      ).toEqual(['Too short.', 'Needs a digit.']);
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

    it('announces every message, and the hint keeps its place before them', async () => {
      const field: UseFormField = (name) => ({
        control: { name },
        error: ['A.', 'B.'],
      });
      render(
        <UiProvider
          adapters={{ i18n: { locale: 'en' }, form: { field: field } }}
        >
          <FormInput name="email" label="Email" hint="Work address." />
        </UiProvider>,
      );
      await waitFor(() =>
        expect(
          screen.getByRole('textbox', { name: 'Email' }),
        ).toHaveAccessibleDescription('Work address. A. B.'),
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

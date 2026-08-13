import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { FormDateInput } from './form-date-input.component.js';
import { UiProvider } from '../../i18n/provider.js';
import type { UseFormField } from '../../form/form-adapter.types.js';

/**
 * Render a bound field with a hand-written adapter, so the test names no form
 * library — and can therefore stand in for any of them by varying only what the
 * adapter puts in `control`, which is exactly where the defects were.
 */
function renderBound(
  field: UseFormField,
  ui: React.ReactNode,
  locale = 'it',
): HTMLElement {
  const { container } = render(
    <UiProvider adapters={{ i18n: { locale }, form: { field } }}>
      <form>{ui}</form>
    </UiProvider>,
  );
  return container;
}

function carrier(container: HTMLElement): HTMLInputElement {
  const node = container.querySelector('[data-carrier]');
  if (node === null) throw new Error('no carrier in the rendered output');
  return node as HTMLInputElement;
}

describe('FormDateInput', () => {
  it('names the field once, with a label rather than a legend', () => {
    renderBound(
      (name) => ({ control: { name }, errors: [] }),
      <FormDateInput name="dob" label="Data di nascita" />,
    );
    expect(
      screen.getByRole('textbox', { name: 'Data di nascita' }),
    ).toBeInTheDocument();
    // One text field composes with `Field`, not `Fieldset`: a group is what a
    // radio set is, and this is not one.
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  describe('the binding sees ISO, whatever the user saw', () => {
    it('hands the change event off the carrier, so the value is the ISO date', async () => {
      const onChange = vi.fn();
      renderBound(
        (name) => ({ control: { name, onChange }, errors: [] }),
        <FormDateInput name="dob" label="Data di nascita" />,
      );
      await browser.fill(screen.getByRole('textbox'), '12082026');

      const event = onChange.mock.lastCall?.[0] as {
        target: HTMLInputElement;
      };
      expect(event.target.value).toBe('2026-08-12');
      expect(event.target.name).toBe('dob');
    });

    it('gives the binding a ref to the CARRIER, so a library reading .value gets ISO', async () => {
      // A holder rather than a `let`: assigned only inside a callback, TypeScript
      // narrows a plain variable to `never` and the assertions below stop
      // compiling.
      const held: { node: HTMLInputElement | null } = { node: null };
      const container = renderBound(
        (name) => ({
          control: {
            name,
            ref: (node: HTMLInputElement | null) => {
              held.node = node;
            },
          },
          errors: [],
        }),
        <FormDateInput name="dob" label="Data di nascita" />,
      );
      await browser.fill(screen.getByRole('textbox'), '12082026');
      const bound = held.node;

      // react-hook-form reads the value off the element its ref was handed.
      // Handed the visible field it would read `12/08/2026`; handed nothing —
      // which is what this component did before `carrierRef` existed — it reads
      // `undefined` and stores it for every date field in the form.
      expect(bound).toBe(carrier(container));
      expect(bound?.value).toBe('2026-08-12');
    });
  });

  describe('the seed arrives under either name', () => {
    it('takes `defaultValue`, which is what Conform emits', () => {
      renderBound(
        (name) => ({
          control: { name, defaultValue: '1985-03-12' },
          errors: [],
        }),
        <FormDateInput name="dob" label="Data di nascita" />,
      );
      expect(screen.getByRole('textbox')).toHaveValue('12/03/1985');
    });

    it('takes `value`, which is what Formik and TanStack emit', () => {
      renderBound(
        (name) => ({ control: { name, value: '1985-03-12' }, errors: [] }),
        <FormDateInput name="dob" label="Data di nascita" />,
      );
      expect(screen.getByRole('textbox')).toHaveValue('12/03/1985');
    });

    it('never controls the visible field with the ISO string', () => {
      renderBound(
        (name) => ({ control: { name, value: '1985-03-12' }, errors: [] }),
        <FormDateInput name="dob" label="Data di nascita" />,
      );
      // The user must never be shown the shape the wire wants.
      expect(screen.getByRole('textbox')).not.toHaveValue('1985-03-12');
    });
  });

  it('passes the binding own props through — the ones a hand-picked list dropped', () => {
    const container = renderBound(
      (name) => ({
        control: { name, required: true, id: 'conform-dob' },
        errors: [],
      }),
      <FormDateInput name="dob" label="Data di nascita" />,
    );
    const field = screen.getByRole('textbox');
    expect(field).toBeRequired();
    expect(field).toHaveAttribute('id', 'conform-dob');
    // `required` never reaches the carrier: an invalid control the browser
    // cannot focus makes it refuse the submit while showing nothing.
    expect(carrier(container)).not.toBeRequired();
  });

  it('shows the hint before the errors, and wires both to the field', () => {
    renderBound(
      (name) => ({ control: { name }, errors: ['Serve una data.'] }),
      <FormDateInput
        name="dob"
        label="Data di nascita"
        hint="Come sul passaporto."
      />,
    );
    // The hint, the error, and the FORMAT — in that order. Asserting the first
    // two exactly is what let the format go unannounced for as long as it did:
    // a placeholder is the last thing an accessible description falls back to,
    // so an error alone was enough to silence it.
    expect(screen.getByRole('textbox')).toHaveAccessibleDescription(
      /Come sul passaporto\. Serve una data\..*gg\/mm\/aaaa/,
    );
  });
});

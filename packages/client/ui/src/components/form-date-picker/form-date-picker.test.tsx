import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { FormDatePicker } from './form-date-picker.component.js';
import { UiProvider } from '../../i18n/provider.js';
import { expectNoA11yViolations } from '../../test/axe.js';
import type { UseFormField } from '../../form/form-adapter.types.js';

/**
 * Render a bound picker with a hand-written adapter, so the test names no form
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

const open = () =>
  browser.click(screen.getByRole('button', { name: 'Scegli dal calendario' }));

describe('FormDatePicker', () => {
  it('names the field once, with a label rather than a legend', () => {
    renderBound(
      (name) => ({ control: { name }, errors: [] }),
      <FormDatePicker name="departure" label="Data di partenza" />,
    );
    expect(
      screen.getByRole('textbox', { name: 'Data di partenza' }),
    ).toBeInTheDocument();
    // One text field composes with `Field`, not `Fieldset`: a group is what a
    // radio set is, and this is not one.
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  describe('the calendar reaches the binding with no library lever', () => {
    it('tells the binding when a day is chosen from the grid', async () => {
      const onChange = vi.fn();
      const container = renderBound(
        (name) => ({
          control: { name, onChange, defaultValue: '2026-08-01' },
          errors: [],
        }),
        <FormDatePicker name="departure" label="Data di partenza" />,
      );

      await open();
      await browser.click(
        container.querySelector('[data-day="2026-08-12"]') as HTMLElement,
      );

      // THE POINT OF THIS COMPONENT. Hand-composed, the calendar cannot reach
      // the carrier — the binding holds that ref — so the write has to go
      // through `setValue`, `handleChange` or whatever this library calls it.
      // Here the component owns the field, so it writes the node itself, the
      // way a keystroke does, and the binding hears an ordinary change event.
      const event = onChange.mock.lastCall?.[0] as { target: HTMLInputElement };
      expect(event.target.value).toBe('2026-08-12');
      expect(event.target.name).toBe('departure');
    });

    it('gives the binding a ref to the CARRIER, not to the visible field', async () => {
      // A holder rather than a `let`: assigned only inside a callback,
      // TypeScript narrows a plain variable to `never`.
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
        <FormDatePicker name="departure" label="Data di partenza" />,
      );
      await browser.fill(screen.getByRole('textbox'), '12082026');

      // Merged with the picker's own, which is what makes both possible at
      // once: the library reads ISO off this node, and the calendar writes it.
      expect(held.node).toBe(carrier(container));
      expect(held.node?.value).toBe('2026-08-12');
    });

    it('shows the picked day in the locale order while the binding gets ISO', async () => {
      const container = renderBound(
        (name) => ({
          control: { name, defaultValue: '2026-08-01' },
          errors: [],
        }),
        <FormDatePicker name="departure" label="Data di partenza" />,
      );

      await open();
      await browser.click(
        container.querySelector('[data-day="2026-08-12"]') as HTMLElement,
      );

      expect(
        screen.getByRole('textbox', { name: 'Data di partenza' }),
      ).toHaveValue('12/08/2026');
      expect(carrier(container).value).toBe('2026-08-12');
    });
  });

  describe('the seed arrives under either name', () => {
    it('takes `defaultValue`, which is what Conform emits', async () => {
      const container = renderBound(
        (name) => ({
          control: { name, defaultValue: '1985-03-12' },
          errors: [],
        }),
        <FormDatePicker name="dob" label="Data di nascita" />,
      );
      expect(screen.getByRole('textbox')).toHaveValue('12/03/1985');

      // …and the calendar opens on it rather than on today.
      await open();
      expect(
        container.querySelector('[data-day="1985-03-12"]'),
      ).toHaveAttribute('aria-selected', 'true');
    });

    it('takes `value`, which is what Formik and TanStack emit', () => {
      renderBound(
        (name) => ({ control: { name, value: '1985-03-12' }, errors: [] }),
        <FormDatePicker name="dob" label="Data di nascita" />,
      );
      expect(screen.getByRole('textbox')).toHaveValue('12/03/1985');
    });

    it('never controls the visible field with the ISO string', () => {
      renderBound(
        (name) => ({ control: { name, value: '1985-03-12' }, errors: [] }),
        <FormDatePicker name="dob" label="Data di nascita" />,
      );
      // Passed through as `value`, the box would read `1985-03-12` in every
      // locale on earth.
      expect(screen.getByRole('textbox')).not.toHaveValue('1985-03-12');
    });
  });

  it('never lets a native-control prop through to a field that is not one', () => {
    renderBound(
      (name) => ({
        control: {
          name,
          // What a schema declaring `types: { dob: 'date' }` emits. Forwarded,
          // the visible field becomes a native picker whose ISO value the mask
          // re-segments into a different date, and `pattern` can never match
          // `12/03/1985`, which blocks the submit for good.
          type: 'date',
          pattern: '\\d{4}-\\d{2}-\\d{2}',
          min: '1900-01-01',
        },
        errors: [],
      }),
      <FormDatePicker name="dob" label="Data di nascita" />,
    );

    const field = screen.getByRole('textbox');
    expect(field).toHaveAttribute('type', 'text');
    expect(field).not.toHaveAttribute('pattern');
    expect(field).not.toHaveAttribute('min');
  });

  it('shows the hint before the errors, and wires both to the field', () => {
    renderBound(
      (name) => ({
        control: { name },
        errors: ['Serve una data.', 'Non può essere passata.'],
      }),
      <FormDatePicker
        name="departure"
        label="Data di partenza"
        hint="Il primo giorno del viaggio."
      />,
    );

    const field = screen.getByRole('textbox');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    const described = (field.getAttribute('aria-describedby') ?? '').split(' ');
    const text = described
      .map((id) => document.getElementById(id)?.textContent)
      .join('|');
    // The hint first, then each message as its own element — joined, a screen
    // reader reads them as one run-on sentence.
    expect(text).toContain('Il primo giorno del viaggio.');
    expect(text).toContain('Serve una data.');
    expect(text).toContain('Non può essere passata.');
  });

  it('has no accessibility violations, closed and open', async () => {
    const container = renderBound(
      (name) => ({
        control: { name, defaultValue: '2026-08-12' },
        errors: ['Serve una data.'],
      }),
      <FormDatePicker
        name="departure"
        label="Data di partenza"
        hint="Il primo giorno del viaggio."
      />,
    );

    await expectNoA11yViolations(container);
    await open();
    await expectNoA11yViolations(container);
  });
});

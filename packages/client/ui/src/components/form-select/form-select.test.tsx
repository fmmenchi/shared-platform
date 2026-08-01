import { describe, it, expect, vi } from 'vitest';
import { createRef, useState, type ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormSelect } from './form-select.component.js';
import { UiProvider } from '../../i18n/provider.js';
import type { UseFormField } from '../../form/form-adapter.types.js';

const options = (
  <>
    <option value="">Choose…</option>
    <option value="it">Italy</option>
    <option value="fr">France</option>
  </>
);

const provider = (field: UseFormField, children: ReactNode) => (
  <UiProvider adapters={{ i18n: { locale: 'en' }, form: { field } }}>
    {children}
  </UiProvider>
);

describe('FormSelect, against the contract itself', () => {
  it('binds a select and keeps the options as content', () => {
    const field: UseFormField = (name) => ({ control: { name } });
    render(
      provider(
        field,
        <FormSelect name="country" label="Country">
          {options}
        </FormSelect>,
      ),
    );

    const control = screen.getByRole('combobox', { name: 'Country' });
    expect(control.tagName).toBe('SELECT');
    expect(control).toHaveAttribute('name', 'country');
    expect(screen.getByRole('option', { name: 'Italy' })).toBeInTheDocument();
  });

  it('collects the choice through the adapter’s own onChange', async () => {
    const user = userEvent.setup();
    function Host() {
      const [value, setValue] = useState('');
      const field: UseFormField = (name) => ({
        control: { name, onChange: (event) => setValue(event.target.value) },
      });
      return (
        <>
          <output>{value}</output>
          {provider(
            field,
            <FormSelect name="country" label="Country">
              {options}
            </FormSelect>,
          )}
        </>
      );
    }
    render(<Host />);

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Country' }),
      'fr',
    );
    expect(screen.getByRole('status')).toHaveTextContent('fr');
  });

  it('renders every message, and the hint keeps its place before them', async () => {
    const field: UseFormField = (name) => ({
      control: { name },
      // TWO messages: with one, `messages.slice(0, 1)` in the component left
      // this test green while claiming to render every message.
      errors: ['Pick a country.', 'We only ship to the EU.'],
    });
    render(
      provider(
        field,
        <FormSelect name="country" label="Country" hint="Where you live.">
          {options}
        </FormSelect>,
      ),
    );

    const control = screen.getByRole('combobox', { name: 'Country' });
    await waitFor(() =>
      expect(control).toHaveAccessibleDescription(
        'Where you live. Pick a country. We only ship to the EU.',
      ),
    );
    expect(control).toHaveAttribute('aria-invalid', 'true');
  });

  it('shares the ref, and drops what the binding owns', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const user = userEvent.setup();
    const seen: string[] = [];
    const bindingRef = createRef<HTMLSelectElement>();
    const callSiteRef = createRef<HTMLSelectElement>();
    const stolen = vi.fn();
    const field: UseFormField = (name) => ({
      control: {
        name,
        ref: bindingRef as never,
        onChange: (event) => seen.push(event.target.value),
      },
    });
    // What a JavaScript consumer can still do, and TypeScript cannot see.
    const forced = { onChange: stolen, value: 'it' } as object;

    render(
      provider(
        field,
        <FormSelect
          name="country"
          label="Country"
          ref={callSiteRef}
          {...forced}
        >
          {options}
        </FormSelect>,
      ),
    );

    const control = screen.getByRole('combobox', { name: 'Country' });
    expect(bindingRef.current).toBe(control);
    expect(callSiteRef.current).toBe(control);

    await user.selectOptions(control, 'fr');
    expect(seen).toEqual(['fr']);
    expect(stolen).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('FormSelect: `onChange`, `value` are owned'),
    );
    warn.mockRestore();
  });

  it('drops the props only an <input> can carry', () => {
    // THE Conform case, and the reason the port filters instead of merely
    // re-typing: `getInputProps` is the only helper its adapter can call for a
    // field it was not told is a select, and it emits these from the schema's
    // constraints. Measured before the fix: they reached the DOM verbatim, and
    // `multiple` flipped the element's role from combobox to listbox.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const field: UseFormField = (name) => ({
      control: {
        name,
        type: 'text',
        pattern: '[a-z]+',
        accept: 'image/*',
        min: 1,
        step: 2,
        multiple: true,
      },
    });
    render(
      provider(
        field,
        <FormSelect name="country" label="Country">
          {options}
        </FormSelect>,
      ),
    );

    const control = screen.getByRole<HTMLSelectElement>('combobox', {
      name: 'Country',
    });
    expect(control.multiple).toBe(false);
    for (const attribute of ['type', 'pattern', 'accept', 'min', 'step']) {
      expect(control).not.toHaveAttribute(attribute);
    }
    warn.mockRestore();
  });

  it('throws by name when there is no binding in scope', () => {
    const error = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    expect(() =>
      render(
        <FormSelect name="country" label="Country">
          {options}
        </FormSelect>,
      ),
    ).toThrow(/FormSelect: no form binding in scope/);
    error.mockRestore();
  });
});

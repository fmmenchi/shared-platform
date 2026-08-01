import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UiProvider, FormSelect } from '@fmmenchi/ui';
import { FormProvider, useForm, type Resolver } from 'react-hook-form';
import { useRhfField } from '@fmmenchi/ui-form-ports/react-hook-form';

/**
 * `FormSelect` shipped with ZERO real-library coverage — an adversarial review
 * found that its only appearance next door was inside an unrendered JSX tree of
 * a compile-only test. Its twin `FormTextarea` had this; this is the equivalent.
 */
type Values = { country: string };

const REQUIRED = 'Pick a country.';

const resolver: Resolver<Values> = (values) => {
  const errors: Record<string, { type: string; message: string }> = {};
  if (!values.country) errors.country = { type: 'required', message: REQUIRED };
  return Object.keys(errors).length > 0
    ? { values: {}, errors }
    : { values, errors: {} };
};

function CountryForm({ onSubmit }: { onSubmit: (v: Values) => void }) {
  const form = useForm<Values>({ defaultValues: { country: '' }, resolver });
  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <UiProvider
          adapters={{ i18n: { locale: 'en' }, form: { field: useRhfField } }}
        >
          <FormSelect name="country" label="Country">
            <option value="">Choose…</option>
            <option value="it">Italy</option>
            <option value="fr">France</option>
          </FormSelect>
        </UiProvider>
        <button type="submit">Save</button>
      </form>
    </FormProvider>
  );
}

describe('FormSelect over react-hook-form', () => {
  it('registers, collects the choice and submits it', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<CountryForm onSubmit={onSubmit} />);

    const select = screen.getByRole('combobox', { name: 'Country' });
    expect(select.tagName).toBe('SELECT');

    await user.selectOptions(select, 'fr');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ country: 'fr' });
  });

  it('carries the library’s message to the eye and to assistive tech', async () => {
    const user = userEvent.setup();
    render(<CountryForm onSubmit={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    const select = screen.getByRole('combobox', { name: 'Country' });
    await waitFor(() => expect(select).toHaveAttribute('aria-invalid', 'true'));
    await waitFor(() => expect(select).toHaveAccessibleDescription(REQUIRED));
  });
});

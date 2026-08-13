import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { UiProvider, FormDateInput, type UseFormField } from '@fmmenchi/ui';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';

/**
 * The date field against the REAL react-hook-form.
 *
 * This file exists because of what its absence cost. `FormDateInput` shipped
 * with the binding's `ref` deliberately not forwarded — a decision that read
 * well and was wrong: `register()` reads a field's value off the element its ref
 * was handed, so with no element the form stored `undefined` for the date
 * however much was typed, for ever, while `FormData` and the component's own
 * suite both looked perfectly correct. Nothing in `packages/client/ui` could see
 * it, because nothing there renders a form library.
 */
const useRhfField: UseFormField = (name) => {
  const { register } = useFormContext();
  return { control: register(name), errors: [] };
};

function DateForm({
  onSubmit,
  defaultValues = { dob: '' },
  locale = 'it',
}: {
  onSubmit: (values: unknown) => void;
  defaultValues?: { dob: string };
  locale?: string;
}) {
  const form = useForm({ defaultValues });
  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <UiProvider
          adapters={{ i18n: { locale }, form: { field: useRhfField } }}
        >
          <FormDateInput name="dob" label="Data di nascita" />
        </UiProvider>
        <button type="submit">Invia</button>
      </form>
    </FormProvider>
  );
}

describe('FormDateInput through react-hook-form', () => {
  it('submits the ISO date the user typed, not undefined and not the text', async () => {
    const onSubmit = vi.fn();
    render(<DateForm onSubmit={onSubmit} />);

    await browser.fill(
      screen.getByRole('textbox', { name: 'Data di nascita' }),
      '12082026',
    );
    await browser.click(screen.getByRole('button', { name: 'Invia' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    // The three ways this went wrong: `undefined` (no ref), `12/08/2026` (ref on
    // the visible field), and the right answer.
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ dob: '2026-08-12' });
  });

  it('shows a defaultValue in the locale order and submits it back as ISO', async () => {
    const onSubmit = vi.fn();
    render(
      <DateForm onSubmit={onSubmit} defaultValues={{ dob: '1985-03-12' }} />,
    );

    expect(
      screen.getByRole('textbox', { name: 'Data di nascita' }),
    ).toHaveValue('12/03/1985');

    await browser.click(screen.getByRole('button', { name: 'Invia' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ dob: '1985-03-12' });
  });

  it('reads the same digits as a different day under a different locale', async () => {
    const onSubmit = vi.fn();
    render(<DateForm onSubmit={onSubmit} locale="en-US" />);

    // `12/08` is 8 December where the month leads, and 12 August where the day
    // does. The order is the DECLARED locale's, all the way to the wire.
    await browser.fill(
      screen.getByRole('textbox', { name: 'Data di nascita' }),
      '12082026',
    );
    await browser.click(screen.getByRole('button', { name: 'Invia' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ dob: '2026-12-08' });
  });

  it('submits nothing for a date that does not exist', async () => {
    const onSubmit = vi.fn();
    render(<DateForm onSubmit={onSubmit} />);

    // 30 February can be typed — refusing it mid-edit would mean refusing the
    // `3` of a `30` on its way to March — and is then simply never stored.
    await browser.fill(
      screen.getByRole('textbox', { name: 'Data di nascita' }),
      '30022026',
    );
    await browser.click(screen.getByRole('button', { name: 'Invia' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ dob: '' });
  });
});

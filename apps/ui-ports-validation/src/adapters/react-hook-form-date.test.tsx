import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import {
  UiProvider,
  FormDateInput,
  FormDatePicker,
  type UseFormField,
} from '@fmmenchi/ui';
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

  it('follows the library when it sets the value from outside', async () => {
    function SetValueForm() {
      const form = useForm({ defaultValues: { dob: '' } });
      return (
        <FormProvider {...form}>
          <UiProvider
            adapters={{ i18n: { locale: 'it' }, form: { field: useRhfField } }}
          >
            <FormDateInput name="dob" label="Data di nascita" />
          </UiProvider>
          <button
            type="button"
            onClick={() => form.setValue('dob', '2000-01-05')}
          >
            Imposta
          </button>
        </FormProvider>
      );
    }
    render(<SetValueForm />);

    const field = screen.getByRole('textbox', { name: 'Data di nascita' });
    await browser.fill(field, '12082026');
    expect(field).toHaveValue('12/08/2026');

    // `setValue` writes straight onto the element `register()`'s ref was given —
    // the carrier — without going through this component at all. Nothing
    // observed that: the carrier held the new date and the user went on reading
    // the old one, and the form submitted a date that was never on screen.
    await browser.click(screen.getByRole('button', { name: 'Imposta' }));

    expect(field).toHaveValue('05/01/2000');
  });

  it('follows a reset back to the value the form started with', async () => {
    function ResetForm() {
      const form = useForm({ defaultValues: { dob: '1985-03-12' } });
      return (
        <FormProvider {...form}>
          <UiProvider
            adapters={{ i18n: { locale: 'it' }, form: { field: useRhfField } }}
          >
            <FormDateInput name="dob" label="Data di nascita" />
          </UiProvider>
          <button type="button" onClick={() => form.reset()}>
            Azzera
          </button>
        </FormProvider>
      );
    }
    render(<ResetForm />);

    const field = screen.getByRole('textbox', { name: 'Data di nascita' });
    // Seeded from the form's own defaults: `register()` writes the carrier and
    // the field follows it.
    expect(field).toHaveValue('12/03/1985');

    await browser.type(field, '{Control>}a{/Control}01012000');
    await browser.click(screen.getByRole('button', { name: 'Azzera' }));

    expect(field).toHaveValue('12/03/1985');
  });

  it('takes defaultValues holding a DATETIME, which is what a stored Date becomes', async () => {
    const onSubmit = vi.fn();
    const { container } = render(
      <DateForm
        onSubmit={onSubmit}
        defaultValues={{ dob: '2026-08-12T00:00:00.000Z' }}
      />,
    );

    // `register()`'s ref callback writes the node in the COMMIT phase, before
    // the effect that wraps the `value` descriptor has run — so this write goes
    // past all three of the doors that watch for one. Measured: the box was
    // empty, the carrier held the instant, and the form posted it.
    expect(
      screen.getByRole('textbox', { name: 'Data di nascita' }),
    ).toHaveValue('12/08/2026');
    const form = container.querySelector('form') as HTMLFormElement;
    expect(new FormData(form).getAll('dob')).toEqual(['2026-08-12']);
  });

  it('the PICKER submits what the grid chose, and follows setValue back', async () => {
    // The ref-based half of the picker's claim, which nothing here tested: the
    // calendar reaches the binding with no library lever, because the component
    // holds the carrier alongside `register()`'s ref and writes it the way a
    // keystroke does.
    function PickerForm() {
      const form = useForm({ defaultValues: { dob: '2026-08-01' } });
      return (
        <FormProvider {...form}>
          <form>
            <UiProvider
              adapters={{
                i18n: { locale: 'it' },
                form: { field: useRhfField },
              }}
            >
              <FormDatePicker name="dob" label="Data di nascita" />
            </UiProvider>
            <button
              type="button"
              onClick={() => form.setValue('dob', '2000-01-05')}
            >
              Da fuori
            </button>
            <output data-testid="held">{form.watch('dob')}</output>
          </form>
        </FormProvider>
      );
    }
    const { container } = render(<PickerForm />);

    await browser.click(
      screen.getByRole('button', {
        name: 'Scegli Data di nascita dal calendario',
      }),
    );
    await browser.click(
      container.querySelector('[data-day="2026-08-20"]') as HTMLElement,
    );

    // What the form holds, and what it would post.
    await waitFor(() =>
      expect(screen.getByTestId('held')).toHaveTextContent('2026-08-20'),
    );
    const form = container.querySelector('form') as HTMLFormElement;
    expect(new FormData(form).getAll('dob')).toEqual(['2026-08-20']);

    // …and the other direction: `setValue` assigns onto the node its ref was
    // handed, with no event and no render, so only the wrapped `value`
    // descriptor can see it.
    await browser.click(screen.getByRole('button', { name: 'Da fuori' }));
    expect(
      screen.getByRole('textbox', { name: 'Data di nascita' }),
    ).toHaveValue('05/01/2000');
  });

  it('refuses the submit for a date that does not exist', async () => {
    const onSubmit = vi.fn();
    render(<DateForm onSubmit={onSubmit} />);

    // 30 February can be TYPED — refusing it mid-edit would mean refusing the
    // `3` of a `30` on its way to March — and is then never stored. What
    // changed is what happens next: the field used to submit an empty string,
    // so the user saw `30/02/2026` on screen and "this field is required"
    // underneath it. Now the box says it holds no date, which is what the
    // native control says about the same keystrokes.
    const field = screen.getByRole('textbox', {
      name: 'Data di nascita',
    }) as HTMLInputElement;
    await browser.fill(field, '30022026');
    await browser.click(screen.getByRole('button', { name: 'Invia' }));

    expect(field.validity.customError).toBe(true);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

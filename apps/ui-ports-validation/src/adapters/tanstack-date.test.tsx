import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { useForm } from '@tanstack/react-form';
import { UiProvider, FormDateInput, FormDatePicker } from '@fmmenchi/ui';
import { createTanstackField } from '@fmmenchi/ui-form-ports/tanstack';

/**
 * The date family against TanStack Form — the second CONTROLLED library, and
 * the one whose API looks least like the others.
 *
 * `formik-date.test.tsx` beside this file covers the same shape through Formik.
 * Two are worth having: the defect they both catch is a property of the SHAPE
 * (a library that hands over `value` and no `ref`, expecting the value it holds
 * to be rendered back), and a single library leaves it open whether the repair
 * fits the shape or fits that library.
 */
function DateForm({
  onSubmit,
  picker = false,
}: {
  onSubmit: (values: { dob: string }) => void;
  picker?: boolean;
}) {
  const form = useForm({
    defaultValues: { dob: '2026-08-12' },
    onSubmit: ({ value }) => onSubmit(value),
  });
  const useTanstackDate = createTanstackField(form);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <UiProvider
        adapters={{ i18n: { locale: 'it' }, form: { field: useTanstackDate } }}
      >
        {picker ? (
          <FormDatePicker name="dob" label="Data di nascita" />
        ) : (
          <FormDateInput name="dob" label="Data di nascita" />
        )}
      </UiProvider>
      <button
        type="button"
        onClick={() => form.setFieldValue('dob', '2000-01-05')}
      >
        Da fuori
      </button>
      <button type="button" onClick={() => form.setFieldValue('dob', '')}>
        Svuota
      </button>
      <button type="submit">Invia</button>
    </form>
  );
}

const carrier = (container: HTMLElement) =>
  container.querySelector('[data-carrier]') as HTMLInputElement;

describe('the date family under TanStack Form', () => {
  it('shows what the form holds, on the first render', () => {
    render(<DateForm onSubmit={() => undefined} />);
    expect(
      screen.getByRole('textbox', { name: 'Data di nascita' }),
    ).toHaveValue('12/08/2026');
  });

  it('follows setFieldValue onto the box and the carrier', async () => {
    const { container } = render(<DateForm onSubmit={() => undefined} />);

    await browser.click(screen.getByRole('button', { name: 'Da fuori' }));

    expect(
      screen.getByRole('textbox', { name: 'Data di nascita' }),
    ).toHaveValue('05/01/2000');
    expect(carrier(container).value).toBe('2000-01-05');
  });

  it('follows a clear', async () => {
    const { container } = render(<DateForm onSubmit={() => undefined} />);

    await browser.click(screen.getByRole('button', { name: 'Svuota' }));

    expect(
      screen.getByRole('textbox', { name: 'Data di nascita' }),
    ).toHaveValue('');
    expect(carrier(container).value).toBe('');
  });

  it('does the same through the picker', async () => {
    const { container } = render(
      <DateForm onSubmit={() => undefined} picker />,
    );

    await browser.click(screen.getByRole('button', { name: 'Da fuori' }));

    expect(
      screen.getByRole('textbox', { name: 'Data di nascita' }),
    ).toHaveValue('05/01/2000');
    expect(carrier(container).value).toBe('2000-01-05');
  });

  it('submits the ISO the user typed, not the one it started with', async () => {
    const submitted: { dob: string }[] = [];
    render(<DateForm onSubmit={(values) => submitted.push(values)} />);

    await browser.fill(
      screen.getByRole('textbox', { name: 'Data di nascita' }),
      '01011990',
    );
    await browser.click(screen.getByRole('button', { name: 'Invia' }));

    await waitFor(() => expect(submitted).toHaveLength(1));
    expect(submitted[0]?.dob).toBe('1990-01-01');
  });
});

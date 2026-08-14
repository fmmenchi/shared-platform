import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { FormProvider, getFormProps, useForm } from '@conform-to/react';
import { UiProvider, FormDateInput, FormDatePicker } from '@fmmenchi/ui';
import { createConformField } from '@fmmenchi/ui-form-ports/conform';

/**
 * The date family against Conform — the FORMDATA library, and the third shape.
 *
 * Neither controlled nor ref-based: it emits `defaultValue` and leaves the DOM
 * to keep the value, then reads the form's own `FormData` on submit. That makes
 * it the one library for which the carrier IS the state, so it is the sharpest
 * test of the claim this family is built on — what the user sees and what the
 * server receives are two different strings naming the same day.
 *
 * `types: { dob: 'date' }` is declared on purpose. It is the natural thing to
 * declare for a date, and it is what made Conform emit `type="date"`,
 * `pattern`, `min` and `max` into a masked TEXT field: the native control took
 * over and re-segmented the ISO into a different day, and the `pattern` could
 * never match `12/08/2026`, so the submit was blocked for good. The routing
 * table in the bound components exists for this, and nothing outside this app
 * can see it work.
 */
const conformDate = createConformField({ types: { dob: 'date' } });

function DateForm({ picker = false }: { picker?: boolean }) {
  const [form] = useForm({ defaultValue: { dob: '2026-08-12' } });
  return (
    <FormProvider context={form.context}>
      <form {...getFormProps(form)}>
        <UiProvider
          adapters={{ i18n: { locale: 'it' }, form: { field: conformDate } }}
        >
          {picker ? (
            <FormDatePicker name="dob" label="Data di nascita" />
          ) : (
            <FormDateInput name="dob" label="Data di nascita" />
          )}
        </UiProvider>
        <button type="reset">Annulla</button>
      </form>
    </FormProvider>
  );
}

const carrier = (container: HTMLElement) =>
  container.querySelector('[data-carrier]') as HTMLInputElement;

describe('the date family under Conform', () => {
  it('takes the seed Conform emits, and shows it in the locale order', () => {
    render(<DateForm />);
    expect(
      screen.getByRole('textbox', { name: 'Data di nascita' }),
    ).toHaveValue('12/08/2026');
  });

  it('never lets `types: { dob: "date" }` reach the field', () => {
    render(<DateForm />);
    const field = screen.getByRole('textbox', { name: 'Data di nascita' });

    // Forwarded, the visible field becomes a native picker whose ISO value the
    // mask re-segments into a different date; `pattern` is checked against
    // `12/08/2026` and can never match, which blocks the submit for good.
    expect(field).toHaveAttribute('type', 'text');
    expect(field).not.toHaveAttribute('pattern');
    expect(field).not.toHaveAttribute('min');
  });

  it('posts one entry, under one name, as ISO', async () => {
    const { container } = render(<DateForm />);
    await browser.fill(
      screen.getByRole('textbox', { name: 'Data di nascita' }),
      '01011990',
    );

    const form = container.querySelector('form') as HTMLFormElement;
    expect([...new FormData(form).keys()]).toEqual(['dob']);
    expect(new FormData(form).getAll('dob')).toEqual(['1990-01-01']);
  });

  it('comes back from a reset button, box and carrier together', async () => {
    const { container } = render(<DateForm />);
    await browser.fill(
      screen.getByRole('textbox', { name: 'Data di nascita' }),
      '01011990',
    );
    expect(carrier(container).value).toBe('1990-01-01');

    await browser.click(screen.getByRole('button', { name: 'Annulla' }));

    expect(carrier(container).value).toBe('2026-08-12');
    expect(
      screen.getByRole('textbox', { name: 'Data di nascita' }),
    ).toHaveValue('12/08/2026');
  });

  it('does all of it through the picker too', async () => {
    const { container } = render(<DateForm picker />);
    expect(
      screen.getByRole('textbox', { name: 'Data di nascita' }),
    ).toHaveValue('12/08/2026');

    await browser.click(
      screen.getByRole('button', {
        name: 'Scegli Data di nascita dal calendario',
      }),
    );
    await browser.click(
      container.querySelector('[data-day="2026-08-20"]') as HTMLElement,
    );

    const form = container.querySelector('form') as HTMLFormElement;
    expect(new FormData(form).getAll('dob')).toEqual(['2026-08-20']);
  });
});

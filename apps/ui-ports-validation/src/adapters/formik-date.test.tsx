import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { UiProvider, FormDateInput, FormDatePicker } from '@fmmenchi/ui';
import { Formik, Form as FormikForm, useFormikContext } from 'formik';
import { createFormikField } from '@fmmenchi/ui-form-ports/formik';

/**
 * The date family against a CONTROLLED form library, which is the half nothing
 * tested.
 *
 * `react-hook-form-date.test.tsx` beside this one exists because `FormDateInput`
 * shipped with the binding's ref unforwarded, and "nothing in
 * `packages/client/ui` could see it, because nothing there renders a form
 * library". This file exists for the twin of that defect, found the same way and
 * one library over.
 *
 * A ref-based library — `register`, `getInputProps` — writes the DOM node, and
 * `DateInput` watches the node. A CONTROLLED one hands over `value` and no ref
 * at all, because it expects the value it holds to be rendered back. This family
 * cannot render it back — an ISO string in the box would read `2026-08-12` in
 * every locale on earth — so it folded the value into a one-shot seed and never
 * looked at it again. Measured before the repair: `setFieldValue` moved a
 * `FormInput` beside it and left the date field, and its carrier, on the old
 * date, so `FormData` posted one date while Formik's state held another.
 */
const useFormikDate = createFormikField();

function Outside({ children }: { children: React.ReactNode }) {
  return (
    <Formik
      initialValues={{ dob: '2026-08-12', departure: '2026-08-12' }}
      onSubmit={() => undefined}
    >
      <FormikForm>
        <UiProvider
          adapters={{ i18n: { locale: 'it' }, form: { field: useFormikDate } }}
        >
          {children}
        </UiProvider>
        <Setter />
      </FormikForm>
    </Formik>
  );
}

/** What a real screen does: writes the value from somewhere that is not the field. */
function Setter() {
  const { setFieldValue, values } = useFormikContext<{
    dob: string;
    departure: string;
  }>();
  return (
    <>
      <button
        type="button"
        onClick={() => {
          void setFieldValue('dob', '2000-01-05');
          void setFieldValue('departure', '2000-01-05');
        }}
      >
        Da fuori
      </button>
      <button
        type="button"
        onClick={() => {
          void setFieldValue('dob', '');
          void setFieldValue('departure', '');
        }}
      >
        Svuota
      </button>
      <output data-testid="state">{JSON.stringify(values)}</output>
    </>
  );
}

const carrier = (container: HTMLElement, name: string) =>
  container.querySelector(`[data-carrier][name="${name}"]`) as HTMLInputElement;

describe('the date family under Formik, which holds the value itself', () => {
  it('shows what the library holds, on the first render', () => {
    render(
      <Outside>
        <FormDateInput name="dob" label="Data di nascita" />
      </Outside>,
    );
    expect(
      screen.getByRole('textbox', { name: 'Data di nascita' }),
    ).toHaveValue('12/08/2026');
  });

  it('follows setFieldValue — the box, the carrier and the form agree', async () => {
    const { container } = render(
      <Outside>
        <FormDateInput name="dob" label="Data di nascita" />
      </Outside>,
    );

    await browser.click(screen.getByRole('button', { name: 'Da fuori' }));

    expect(
      screen.getByRole('textbox', { name: 'Data di nascita' }),
    ).toHaveValue('05/01/2000');
    // The carrier is what `FormData` reads, and it is what disagreed: the form
    // posted the old ISO while Formik's own state had moved on.
    expect(carrier(container, 'dob').value).toBe('2000-01-05');
    expect(screen.getByTestId('state').textContent).toContain('2000-01-05');
  });

  it('follows a clear, which did nothing at all before', async () => {
    const { container } = render(
      <Outside>
        <FormDateInput name="dob" label="Data di nascita" />
      </Outside>,
    );

    await browser.click(screen.getByRole('button', { name: 'Svuota' }));

    expect(
      screen.getByRole('textbox', { name: 'Data di nascita' }),
    ).toHaveValue('');
    expect(carrier(container, 'dob').value).toBe('');
  });

  it('does the same for the picker, whose claim is that it needs no lever', async () => {
    const { container } = render(
      <Outside>
        <FormDatePicker name="departure" label="Data di partenza" />
      </Outside>,
    );

    await browser.click(screen.getByRole('button', { name: 'Da fuori' }));

    expect(
      screen.getByRole('textbox', { name: 'Data di partenza' }),
    ).toHaveValue('05/01/2000');
    expect(carrier(container, 'departure').value).toBe('2000-01-05');
  });

  it('still lets the user type, and tells Formik what was typed', async () => {
    const { container } = render(
      <Outside>
        <FormDateInput name="dob" label="Data di nascita" />
      </Outside>,
    );

    await browser.fill(
      screen.getByRole('textbox', { name: 'Data di nascita' }),
      '01011990',
    );

    // The other direction, which must not have been broken by the first.
    expect(carrier(container, 'dob').value).toBe('1990-01-01');
    expect(screen.getByTestId('state').textContent).toContain('1990-01-01');
  });
});

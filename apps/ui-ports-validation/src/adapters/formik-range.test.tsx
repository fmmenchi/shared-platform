import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { UiProvider, FormDateRangePicker } from '@fmmenchi/ui';
import { Formik, Form as FormikForm, useFormikContext } from 'formik';
import { createFormikField } from '@fmmenchi/ui-form-ports/formik';

/**
 * The RANGE family against a controlled form library.
 *
 * It exists because of what its absence cost, which is now the third time the
 * same absence has cost the same thing. `formik-date.test.tsx` beside this file
 * was written after a defect that "nothing in `packages/client/ui` could see,
 * because nothing there renders a form library"; this file was written after a
 * review measured the range picker losing an end whenever a library moved BOTH
 * of them in one update — invisible for the identical reason, since a
 * hand-written adapter that holds no state cannot show a library losing state.
 *
 * The move that breaks it is the ordinary one: pick a different trip. Any
 * update where the new range does not overlap the old one fires two carrier
 * writes in a single commit, and judging the first against its old partner
 * declares an inversion that is about to stop existing.
 */
const useFormikRange = createFormikField();

function Stay({ children }: { children: React.ReactNode }) {
  return (
    <Formik
      initialValues={{ checkIn: '2026-08-12', checkOut: '2026-08-15' }}
      onSubmit={() => undefined}
    >
      <FormikForm>
        <UiProvider
          adapters={{ i18n: { locale: 'it' }, form: { field: useFormikRange } }}
        >
          {children}
        </UiProvider>
        <Setter />
      </FormikForm>
    </Formik>
  );
}

/** What a real screen does: moves both ends from somewhere that is not a field. */
function Setter() {
  const { setFieldValue, values } = useFormikContext<{
    checkIn: string;
    checkOut: string;
  }>();
  const move = (checkIn: string, checkOut: string) => () => {
    void setFieldValue('checkIn', checkIn);
    void setFieldValue('checkOut', checkOut);
  };
  return (
    <>
      <button type="button" onClick={move('2027-06-01', '2027-06-08')}>
        Avanti
      </button>
      <button type="button" onClick={move('2025-01-05', '2025-01-09')}>
        Indietro
      </button>
      <output data-testid="state">{JSON.stringify(values)}</output>
    </>
  );
}

const picker = (
  <FormDateRangePicker
    startName="checkIn"
    endName="checkOut"
    startLabel="Arrivo"
    endLabel="Partenza"
    legend="Il tuo soggiorno"
  />
);

const carrier = (container: HTMLElement, name: string) =>
  container.querySelector(`[data-carrier][name="${name}"]`) as HTMLInputElement;

describe('the range family under Formik', () => {
  it('shows what the form holds, on the first render', () => {
    render(<Stay>{picker}</Stay>);
    expect(screen.getByRole('textbox', { name: 'Arrivo' })).toHaveValue(
      '12/08/2026',
    );
    expect(screen.getByRole('textbox', { name: 'Partenza' })).toHaveValue(
      '15/08/2026',
    );
  });

  it('keeps BOTH ends when the library moves both forwards', async () => {
    const { container } = render(<Stay>{picker}</Stay>);

    await browser.click(screen.getByRole('button', { name: 'Avanti' }));

    // Measured before the repair: Formik ended holding
    // `{checkIn: "2027-06-01", checkOut: ""}` — the end cleared by a
    // consistency check judging the new start against the old end.
    expect(carrier(container, 'checkIn').value).toBe('2027-06-01');
    expect(carrier(container, 'checkOut').value).toBe('2027-06-08');
    const state = screen.getByTestId('state').textContent ?? '';
    expect(state).toContain('2027-06-01');
    expect(state).toContain('2027-06-08');
  });

  it('keeps both when the library moves them backwards', async () => {
    const { container } = render(<Stay>{picker}</Stay>);

    // The same defect with the roles swapped, which is what proved it was a
    // stale closure and not the rule: measured `{checkIn: "", checkOut:
    // "2025-01-09"}`.
    await browser.click(screen.getByRole('button', { name: 'Indietro' }));

    expect(carrier(container, 'checkIn').value).toBe('2025-01-05');
    expect(carrier(container, 'checkOut').value).toBe('2025-01-09');
    const state = screen.getByTestId('state').textContent ?? '';
    expect(state).toContain('2025-01-05');
    expect(state).toContain('2025-01-09');
  });

  it('still tells Formik what was typed into each end', async () => {
    const { container } = render(<Stay>{picker}</Stay>);

    await browser.fill(
      screen.getByRole('textbox', { name: 'Arrivo' }),
      '01011990',
    );

    expect(carrier(container, 'checkIn').value).toBe('1990-01-01');
    expect(screen.getByTestId('state').textContent).toContain('1990-01-01');
  });

  it('posts two entries, under the two names', () => {
    const { container } = render(<Stay>{picker}</Stay>);
    const form = container.querySelector('form') as HTMLFormElement;
    const data = new FormData(form);
    expect([...data.keys()]).toEqual(['checkIn', 'checkOut']);
    expect(data.get('checkIn')).toBe('2026-08-12');
    expect(data.get('checkOut')).toBe('2026-08-15');
  });
});

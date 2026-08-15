import { describe, it, expect, vi } from 'vitest';
import { useActionState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { UiProvider, FormDateInput, FormDatePicker } from '@fmmenchi/ui';
import {
  ActionErrorsProvider,
  useActionField,
  type ActionErrors,
} from '@fmmenchi/ui-form-ports/react-19';

/**
 * The date family with NO form library at all — React 19 owns the submission
 * and the DOM owns the value.
 *
 * This is the fifth shape the repo ports and the last one the date family was
 * not tested against. It is also the one where the carrier IS the state: the
 * action is handed a `FormData` and nothing else, so what the field posts is
 * the entire contract. Every other shape has a JavaScript copy of the value to
 * disagree with; here there is nowhere for a disagreement to hide, which makes
 * it the sharpest test of the family's founding promise — the user reads
 * `12/08/2026` and the server receives `2026-08-12`.
 */
function DateForm({
  action,
  picker = false,
}: {
  action: (data: FormData) => void;
  picker?: boolean;
}) {
  const [errors, submit] = useActionState<ActionErrors, FormData>(
    (_state, data) => {
      action(data);
      return {};
    },
    {},
  );
  return (
    <ActionErrorsProvider errors={errors}>
      <form action={submit}>
        <UiProvider
          adapters={{ i18n: { locale: 'it' }, form: { field: useActionField } }}
        >
          {picker ? (
            <FormDatePicker name="dob" label="Data di nascita" />
          ) : (
            <FormDateInput name="dob" label="Data di nascita" />
          )}
        </UiProvider>
        <button type="submit">Invia</button>
        <button type="reset">Annulla</button>
      </form>
    </ActionErrorsProvider>
  );
}

const carrier = (container: HTMLElement) =>
  container.querySelector('[data-carrier]') as HTMLInputElement;

describe('the date family under React 19 actions', () => {
  it('hands the action the ISO, under one name', async () => {
    const action = vi.fn();
    render(<DateForm action={action} />);

    await browser.fill(
      screen.getByRole('textbox', { name: 'Data di nascita' }),
      '12082026',
    );
    await browser.click(screen.getByRole('button', { name: 'Invia' }));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    const data = action.mock.calls[0]?.[0] as FormData;
    expect([...data.keys()]).toEqual(['dob']);
    expect(data.get('dob')).toBe('2026-08-12');
  });

  it('hands it nothing for a half-typed date, rather than half a date', async () => {
    const action = vi.fn();
    render(<DateForm action={action} />);

    await browser.fill(
      screen.getByRole('textbox', { name: 'Data di nascita' }),
      '1208',
    );
    await browser.click(screen.getByRole('button', { name: 'Invia' }));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect((action.mock.calls[0]?.[0] as FormData).get('dob')).toBe('');
  });

  it('comes back from a reset button, box and carrier together', async () => {
    const { container } = render(<DateForm action={vi.fn()} />);
    await browser.fill(
      screen.getByRole('textbox', { name: 'Data di nascita' }),
      '12082026',
    );

    await browser.click(screen.getByRole('button', { name: 'Annulla' }));

    expect(carrier(container).value).toBe('');
    expect(
      screen.getByRole('textbox', { name: 'Data di nascita' }),
    ).toHaveValue('');
  });

  it('does the same through the picker, grid and all', async () => {
    const action = vi.fn();
    const { container } = render(<DateForm action={action} picker />);

    /*
     * THE MONTH IS SAID OUT LOUD, and that is the fix. Before this the field was
     * empty when the picker opened, so the grid showed whatever month it was TODAY —
     * and the day clicked was a hardcoded `2026-08-20`, which existed for exactly as
     * long as August 2026 was the current month. It stopped existing at midnight UTC
     * on 1 September 2026 and CI went red while every developer machine stayed green:
     * commits here are `-0500`, so it was still 31 August locally.
     * `TZ=UTC pnpm nx test @fmmenchi/ui-ports-validation` reproduces it exactly, and
     * that command is how this was found rather than guessed.
     *
     * Filling the field first pins the shown month to the value — which is what the
     * two sibling suites already do (`conform-date` asserts `12/08/2026` before it
     * opens, `react-hook-form-date` has a default), and is why only this one broke.
     * The date the grid shows is now stated by the test instead of inherited from the
     * clock.
     *
     * Deriving the day from `new Date()` was tried first and is worse: it makes the
     * assertion depend on the run's own date, and the grid then differs run to run —
     * a test whose subject moves is a test that cannot be debugged from its output.
     */
    await browser.fill(
      screen.getByRole('textbox', { name: 'Data di nascita' }),
      '12082026',
    );

    await browser.click(
      screen.getByRole('button', {
        name: 'Scegli Data di nascita dal calendario',
      }),
    );

    // Waited for, because the grid is rendered BY the click above — and re-queried
    // rather than held across the await, since a node captured before a re-render is
    // not the node in the document. `querySelector` does not retry the way the
    // `screen.getBy*` calls around it do, and the cast that used to stand alone here
    // hid the null: an absent cell arrived as `Cannot read properties of null
    // (reading 'click')` from inside `browser.click`, naming neither the cell nor
    // the reason.
    await waitFor(() =>
      expect(
        container.querySelector('[data-day="2026-08-20"]'),
        'no cell for 2026-08-20 — is the picker showing August 2026?',
      ).not.toBeNull(),
    );
    await browser.click(
      container.querySelector('[data-day="2026-08-20"]') as HTMLElement,
    );
    await browser.click(screen.getByRole('button', { name: 'Invia' }));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect((action.mock.calls[0]?.[0] as FormData).get('dob')).toBe(
      '2026-08-20',
    );
  });
});

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

  it('refuses the submit for a half-typed date, as the native control does', async () => {
    // CHANGED DELIBERATELY, and the reason is the control this one replaces: a
    // partially filled `input[type=date]` reports `badInput` and the browser
    // stops the submit. This field used to post an empty string instead, so a
    // user looking at `12/08/` got whatever the server said about a missing
    // value — with no way to know the field they had filled in was the problem.
    //
    // A form whose library owns validation sets `noValidate` and is unaffected,
    // which is the right split: the platform speaks only where nothing else is.
    const action = vi.fn();
    const { container } = render(<DateForm action={action} />);

    const field = screen.getByRole('textbox', {
      name: 'Data di nascita',
    }) as HTMLInputElement;
    await browser.fill(field, '1208');
    await browser.click(screen.getByRole('button', { name: 'Invia' }));

    expect(field.validity.customError).toBe(true);
    expect(
      (container.querySelector('form') as HTMLFormElement).checkValidity(),
    ).toBe(false);
    expect(action).not.toHaveBeenCalled();
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

    await browser.click(
      screen.getByRole('button', {
        name: 'Scegli Data di nascita dal calendario',
      }),
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

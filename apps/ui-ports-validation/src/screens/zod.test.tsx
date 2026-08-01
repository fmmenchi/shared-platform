import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UiProvider } from '@fmmenchi/ui';
import { ZodScreen } from './zod.screen.js';
import {
  useRhfField,
  useRhfErrors,
} from '@fmmenchi/ui-form-ports/react-hook-form';

const renderScreen = () =>
  render(
    <UiProvider
      adapters={{
        i18n: { locale: 'en' },
        form: { field: useRhfField, errors: useRhfErrors },
      }}
    >
      <ZodScreen />
    </UiProvider>,
  );

describe('a real zod schema, through the port', () => {
  it('every schema message reaches its field AND the summary', async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.click(screen.getByRole('button', { name: /Create account/ }));

    const summary = await screen.findByRole('group', {
      name: 'There is a problem',
    });
    expect(
      [...summary.querySelectorAll('li')].map((n) => n.textContent),
    ).toEqual([
      'Email: Enter a valid email address.',
      'Password: Use at least 8 characters.',
      'Terms and conditions: You have to accept to continue.',
    ]);

    // the description is hint THEN error, in DOM order — both are announced
    await waitFor(() =>
      expect(
        screen.getByRole('textbox', { name: /Email/ }),
      ).toHaveAccessibleDescription(
        'We’ll only use it to sign you in. Enter a valid email address.',
      ),
    );
  });

  it('a cross-field rule from the schema lands on the right field only', async () => {
    // NOTE every other field is filled in. zod's `.refine()` on an object runs
    // ONLY once the object itself parses, so with any base rule still failing
    // the cross-field rule never executes — a real gotcha, not a test detail.
    const user = userEvent.setup();
    renderScreen();
    await user.type(
      screen.getByRole('textbox', { name: /Email/ }),
      'ada@example.com',
    );
    await user.click(screen.getByRole('checkbox', { name: /I accept/ }));
    await user.type(screen.getByLabelText('Password'), 'longenough1');
    await user.type(screen.getByLabelText('Confirm password'), 'different1');
    await user.click(screen.getByRole('button', { name: /Create account/ }));

    await waitFor(() =>
      expect(
        screen.getByLabelText('Confirm password'),
      ).toHaveAccessibleDescription('The passwords do not match.'),
    );
    expect(screen.getByLabelText('Password')).not.toHaveAttribute(
      'aria-invalid',
    );
  });

  it('submits when the schema is satisfied — and the summary never appears', async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.type(
      screen.getByRole('textbox', { name: /Email/ }),
      'ada@example.com',
    );
    await user.type(screen.getByLabelText('Password'), 'longenough1');
    await user.type(screen.getByLabelText('Confirm password'), 'longenough1');
    await user.click(screen.getByRole('checkbox', { name: /I accept/ }));
    await user.click(screen.getByRole('button', { name: /Create account/ }));

    expect(
      screen.queryByRole('group', { name: 'There is a problem' }),
    ).toBeNull();
    await waitFor(
      () => expect(screen.getByText(/Submitted:/)).toBeInTheDocument(),
      { timeout: 3000 },
    );
    expect(screen.getByText(/Submitted:/).textContent).toContain(
      'ada@example.com',
    );
  });

  it('the screen wires NO adapter — the binding came from UiProvider', () => {
    // If the setup-time binding were not being found, every field here would
    // throw "no form adapter in scope".
    renderScreen();
    expect(screen.getByRole('textbox', { name: /Email/ })).toHaveAttribute(
      'name',
      'email',
    );
  });
});

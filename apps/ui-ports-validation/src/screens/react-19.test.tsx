import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { React19Screen } from './react-19.screen.js';

describe('React 19 alone, with no form library at all', () => {
  it('a schema in the action produces messages the port carries', async () => {
    const user = userEvent.setup();
    render(<React19Screen />);
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
  });

  it('the same messages land on the fields', async () => {
    const user = userEvent.setup();
    render(<React19Screen />);
    await user.click(screen.getByRole('button', { name: /Create account/ }));
    await waitFor(() =>
      expect(
        screen.getByRole('textbox', { name: /Email/ }),
      ).toHaveAccessibleDescription(
        'We’ll only use it to sign you in. Enter a valid email address.',
      ),
    );
  });

  it('the controls stay NATIVE — the browser collects the values', async () => {
    // No value, no onChange: with an action, FormData does the collecting, which
    // is also what lets the form submit with JavaScript disabled.
    const user = userEvent.setup();
    render(<React19Screen />);
    const email = screen.getByRole<HTMLInputElement>('textbox', {
      name: /Email/,
    });
    await user.type(email, 'ada@example.com');
    expect(email.value).toBe('ada@example.com');

    const form = email.closest('form') as HTMLFormElement;
    expect(new FormData(form).get('email')).toBe('ada@example.com');
  });

  it('submits when the schema is satisfied', async () => {
    const user = userEvent.setup();
    render(<React19Screen />);
    await user.type(
      screen.getByRole('textbox', { name: /Email/ }),
      'ada@example.com',
    );
    await user.type(screen.getByLabelText('Password'), 'longenough1');
    await user.click(screen.getByRole('checkbox', { name: /I accept/ }));
    await user.click(screen.getByRole('button', { name: /Create account/ }));

    await waitFor(
      () => expect(screen.getByText(/Submitted:/)).toBeInTheDocument(),
      { timeout: 3000 },
    );
    expect(
      screen.queryByRole('group', { name: 'There is a problem' }),
    ).toBeNull();
  });
});

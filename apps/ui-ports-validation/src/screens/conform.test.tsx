import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConformScreen } from './conform.screen.js';

const submit = async () => {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: /Create account/ }));
  await waitFor(() =>
    expect(screen.getByRole('textbox', { name: /Email/ })).toHaveAttribute(
      'aria-invalid',
      'true',
    ),
  );
};

describe('Conform through the port', () => {
  it('the schema’s messages reach the fields and the summary', async () => {
    render(<ConformScreen />);
    await submit();

    await waitFor(() =>
      expect(
        screen.getByRole('textbox', { name: /Email/ }),
      ).toHaveAccessibleDescription(
        'We’ll only use it to sign you in. Enter a valid email address.',
      ),
    );
    const summary = screen.getByRole('group', { name: 'There is a problem' });
    expect(summary.textContent).toContain(
      'Email: Enter a valid email address.',
    );
  });

  it('every aria-describedby target EXISTS — the collision this screen was built for', async () => {
    // Conform's getInputProps returns an `aria-describedby` pointing at an error
    // element IT expects you to render. We render FieldError instead, so before
    // the adapter stripped it the attribute carried `<id>-email-error`, which
    // existed nowhere — a dangling reference, silent, and on the accessible part.
    render(<ConformScreen />);
    await submit();

    for (const input of screen.getAllByRole('textbox')) {
      const ids = (input.getAttribute('aria-describedby') ?? '')
        .split(' ')
        .filter(Boolean);
      expect(ids.length).toBeGreaterThan(0);
      for (const id of ids) {
        expect(document.getElementById(id), `dangling: ${id}`).not.toBeNull();
      }
    }
  });

  it('the design system owns the id, so the label still associates', async () => {
    render(<ConformScreen />);
    const input = screen.getByRole('textbox', { name: /Email/ });
    // named by its label at all is the assertion: getByRole with a name would
    // fail otherwise. This pins that Conform's own id did not break it.
    expect(input.id).toBeTruthy();
    expect(document.querySelector(`label[for="${input.id}"]`)).not.toBeNull();
  });

  it('Conform still owns the value: the form validates and clears', async () => {
    const user = userEvent.setup();
    render(<ConformScreen />);
    await submit();

    await user.type(
      screen.getByRole('textbox', { name: /Email/ }),
      'ada@example.com',
    );
    await user.type(screen.getByLabelText('Password'), 'longenough1');
    await user.click(screen.getByRole('checkbox', { name: /I accept/ }));
    await user.click(screen.getByRole('button', { name: /Create account/ }));

    await waitFor(() =>
      expect(
        screen.getByRole('textbox', { name: /Email/ }),
      ).not.toHaveAttribute('aria-invalid', 'true'),
    );
  });
});

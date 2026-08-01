import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentType } from 'react';
import { RhfRecipeScreen } from './rhf.screen.js';
import { FormikScreen } from './formik.screen.js';
import { TanstackScreen } from './tanstack.screen.js';
import { ConformRecipeScreen } from './conform.recipe.screen.js';

/**
 * ONE suite, four libraries.
 *
 * This is the actual test of the port: not that each adapter works, but that
 * the same assertions hold for all of them. A test that had to say "except for
 * Formik" would be the port leaking.
 *
 * They are deliberately written against the ACCESSIBLE surface — the accessible
 * name, the accessible description, `aria-invalid` — because that is what the
 * port exists to keep correct, and it is what a screen reader user gets.
 */
const SCREENS: Array<[string, ComponentType<{ constraints?: boolean }>]> = [
  ['react-hook-form', RhfRecipeScreen],
  ['Formik', FormikScreen],
  ['TanStack Form', TanstackScreen],
  ['Conform', ConformRecipeScreen],
];

const email = () => screen.getByRole('textbox', { name: /Email/ });
const password = () => screen.getByLabelText(/^Password/);
const tos = () => screen.getByRole('checkbox', { name: /terms/i });
const seats = () => screen.getByRole('spinbutton', { name: /Seats/ });

async function submit() {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: /Create account/ }));
}

describe.each(SCREENS)('%s through the port', (_name, Screen) => {
  it('recipe 1+2 — the schema’s messages reach the field that produced them', async () => {
    render(<Screen />);
    await submit();

    // The message lands ON the field: as its error state, and inside its
    // accessible description, after the hint, in DOM order.
    //
    // Awaited as ONE condition because validation is asynchronous in three of
    // the four, and the error's id joins `aria-describedby` a commit after the
    // error itself renders — asserting the description outside the wait passes
    // or fails on how fast the library happens to be.
    await waitFor(() => {
      expect(email()).toHaveAttribute('aria-invalid', 'true');
      expect(email()).toHaveAccessibleDescription(
        'We’ll only use it to sign you in. Enter a valid email address.',
      );
      expect(password()).toHaveAccessibleDescription(
        'Use at least 8 characters.',
      );
      // The checkbox too. Its message reaching the SUMMARY proves nothing about
      // its own binding: the summary comes through a different port member
      // (`errors`), so a checkbox whose field binding is broken still shows up
      // there while standing on it says nothing at all.
      expect(tos()).toHaveAttribute('aria-invalid', 'true');
      expect(tos()).toHaveAccessibleDescription(
        'You have to accept to continue.',
      );
    });
  });

  it('recipe 1 — the summary lists every field in error, by label', async () => {
    render(<Screen />);
    await submit();

    const summary = await screen.findByRole('region', {
      name: 'There is a problem',
    });
    expect(summary.textContent).toContain('Enter a valid email address.');
    expect(summary.textContent).toContain('Use at least 8 characters.');
    // Named by their LABEL, not by their field name — the summary is read out
    // loud and `tos` means nothing to anyone.
    expect(summary.textContent).toContain('Email');
    expect(summary.textContent).toContain('Terms and conditions');
  });

  it('says nothing before the form is sent', () => {
    render(<Screen />);
    expect(email()).not.toHaveAttribute('aria-invalid', 'true');
    expect(
      screen.queryByRole('region', { name: 'There is a problem' }),
    ).toBeNull();
  });

  it('the library still owns the value — a valid form clears', async () => {
    const user = userEvent.setup();
    render(<Screen />);
    await submit();
    await waitFor(() =>
      expect(email()).toHaveAttribute('aria-invalid', 'true'),
    );

    await user.type(email(), 'someone@example.com');
    await user.type(password(), 'a-long-enough-password');
    await user.type(seats(), '3');
    await user.click(tos());
    await submit();

    await waitFor(() =>
      expect(email()).not.toHaveAttribute('aria-invalid', 'true'),
    );
    expect(
      screen.queryByRole('region', { name: 'There is a problem' }),
    ).toBeNull();
    // The typing reached the library and came back: proof the binding is live
    // in both directions, not just rendering what was typed into the DOM.
    expect(email()).toHaveValue('someone@example.com');
    expect(tos()).toBeChecked();
    // And it actually WENT: without this, "no errors are showing" and "the
    // form was accepted" look identical from the outside.
    const sent = await screen.findByText(/^Submitted:/);
    expect(sent.textContent).toContain('someone@example.com');
    // A NUMBER reached the library, not the string the DOM handed over. Written
    // as JSON, so `"seats":3` and `"seats":"3"` are two different assertions —
    // which is the whole point: a schema expecting a number would reject the
    // second, forever, and no amount of typing would fix it.
    expect(sent.textContent).toContain('"seats":3');
  });

  it('every aria-describedby target EXISTS — no dangling reference', async () => {
    render(<Screen />);
    await submit();
    await waitFor(() =>
      expect(email()).toHaveAttribute('aria-invalid', 'true'),
    );

    // A library that writes its own `aria-describedby` points it at an error
    // element IT expects you to render — and the design system renders
    // `FieldError` instead. Conform did exactly that: the attribute carried an
    // id that existed nowhere. Silent, and on the accessible part.
    //
    // Every control, not just the ones with a textbox role: the password field
    // and the checkbox are where a role-filtered check quietly stopped looking.
    for (const control of [email(), password(), seats(), tos()]) {
      const ids = (control.getAttribute('aria-describedby') ?? '')
        .split(' ')
        .filter(Boolean);
      for (const id of ids) {
        expect(document.getElementById(id), `dangling: ${id}`).not.toBeNull();
      }
    }
  });

  it('every control carries its name — the summary links depend on it', () => {
    render(<Screen />);
    // Not decoration: `FormErrorSummary` finds the control to focus by
    // `[name=...]`, and a native submission collects by name. An adapter that
    // dropped it would break both, and nothing else in this suite would notice.
    expect(email()).toHaveAttribute('name', 'email');
    expect(password()).toHaveAttribute('name', 'password');
    expect(tos()).toHaveAttribute('name', 'tos');
  });

  it('recipe 3 — native constraints reach the control unchanged', () => {
    render(<Screen constraints />);
    // The rules as ATTRIBUTES on the element: the browser enforces them before
    // any library runs, and they survive with JavaScript off. The controls are
    // transparent (ADR-0013), so this is the same three lines everywhere.
    expect(email()).toBeRequired();
    expect(password()).toBeRequired();
    expect(password()).toHaveAttribute('minlength', '8');
  });
});

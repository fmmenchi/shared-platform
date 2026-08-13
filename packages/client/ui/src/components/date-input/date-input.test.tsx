import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { DateInput } from './date-input.component.js';
import { Field } from '../field/field.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

/** The carrier: hidden, so it is reachable only as a raw node. */
function carrier(container: HTMLElement): HTMLInputElement {
  const node = container.querySelector('[data-carrier]');
  if (node === null) throw new Error('no carrier in the rendered output');
  return node as HTMLInputElement;
}

describe('DateInput', () => {
  describe('it is one field, written the way the locale writes a date', () => {
    it('is a single textbox, not three', () => {
      renderUi(<DateInput name="dob" aria-label="Date of birth" />, {
        locale: 'it',
      });
      expect(screen.getAllByRole('textbox')).toHaveLength(1);
    });

    it('shows the seeded ISO date in the locale order', () => {
      renderUi(
        <DateInput
          name="dob"
          aria-label="Date of birth"
          defaultValue="2026-08-12"
        />,
        { locale: 'it' },
      );
      expect(screen.getByRole('textbox')).toHaveValue('12/08/2026');
    });

    it('shows the same day differently for en-US', () => {
      renderUi(
        <DateInput
          name="dob"
          aria-label="Date of birth"
          defaultValue="2026-08-12"
        />,
        { locale: 'en-US' },
      );
      expect(screen.getByRole('textbox')).toHaveValue('08/12/2026');
    });

    it('shows the same day differently again for ja-JP', () => {
      renderUi(
        <DateInput
          name="dob"
          aria-label="Date of birth"
          defaultValue="2026-08-12"
        />,
        { locale: 'ja-JP' },
      );
      expect(screen.getByRole('textbox')).toHaveValue('2026/08/12');
    });

    it('hints the format in the locale, letters and order both', () => {
      renderUi(<DateInput name="dob" aria-label="Data" />, { locale: 'it' });
      expect(screen.getByRole('textbox')).toHaveAttribute(
        'placeholder',
        'gg/mm/aaaa',
      );
    });
  });

  describe('what it stores', () => {
    it('posts ISO under one name, whatever the user saw', async () => {
      const { container } = renderUi(
        <form>
          <DateInput name="dob" aria-label="Date of birth" />
        </form>,
        { locale: 'it' },
      );
      await browser.fill(screen.getByRole('textbox'), '12/08/2026');

      const form = container.querySelector('form') as HTMLFormElement;
      expect(new FormData(form).getAll('dob')).toEqual(['2026-08-12']);
    });

    it('reads the SAME digits as a different day under a different locale', async () => {
      const { container } = renderUi(
        <form>
          <DateInput name="dob" aria-label="Date of birth" />
        </form>,
        { locale: 'en-US' },
      );
      // 12/08 is 8 December in en-US and 12 August in it. The order is the
      // locale's, and this is the assertion that says so.
      await browser.fill(screen.getByRole('textbox'), '12/08/2026');

      const form = container.querySelector('form') as HTMLFormElement;
      expect(new FormData(form).getAll('dob')).toEqual(['2026-12-08']);
    });

    it('hands the value back as a day, with months 1-12', async () => {
      const onDateChange = vi.fn();
      renderUi(
        <DateInput
          name="dob"
          aria-label="Date of birth"
          onDateChange={onDateChange}
        />,
        { locale: 'it' },
      );
      await browser.fill(screen.getByRole('textbox'), '12/08/2026');

      expect(onDateChange).toHaveBeenLastCalledWith({
        year: 2026,
        month: 8,
        day: 12,
      });
    });

    it('takes any separator a keyboard offers', async () => {
      const { container } = renderUi(
        <DateInput name="dob" aria-label="Date of birth" />,
        { locale: 'it' },
      );
      for (const typed of ['12-08-2026', '12.08.2026', '12 08 2026']) {
        await browser.fill(screen.getByRole('textbox'), typed);
        expect(carrier(container).value).toBe('2026-08-12');
      }
    });

    it('seeds from a day, and an explicit ISO string wins', () => {
      renderUi(
        <DateInput
          name="dob"
          aria-label="Date of birth"
          defaultValue="1985-03-12"
          defaultDate={{ year: 2000, month: 1, day: 1 }}
        />,
        { locale: 'it' },
      );
      expect(screen.getByRole('textbox')).toHaveValue('12/03/1985');
    });
  });

  describe('the traps', () => {
    it('holds nothing for a date that does not exist, rather than sliding it', async () => {
      const onDateChange = vi.fn();
      const { container } = renderUi(
        <DateInput
          name="dob"
          aria-label="Date of birth"
          onDateChange={onDateChange}
        />,
        { locale: 'it' },
      );
      // `new Date('2026-02-30')` answers 2 March. This must answer nothing.
      await browser.fill(screen.getByRole('textbox'), '30/02/2026');

      expect(carrier(container).value).toBe('');
      expect(onDateChange).toHaveBeenLastCalledWith(null);
    });

    it('refuses a two-digit year rather than guessing a century', async () => {
      const { container } = renderUi(
        <DateInput name="dob" aria-label="Date of birth" />,
        { locale: 'it' },
      );
      await browser.fill(screen.getByRole('textbox'), '12/08/26');
      expect(carrier(container).value).toBe('');
    });

    it('holds nothing while the date is half-typed', async () => {
      const { container } = renderUi(
        <DateInput name="dob" aria-label="Date of birth" />,
        { locale: 'it' },
      );
      await browser.fill(screen.getByRole('textbox'), '12/08');
      expect(carrier(container).value).toBe('');
    });

    it('comes back from form.reset(), which is why the carrier is not type="hidden"', async () => {
      const { container } = renderUi(
        <form>
          <DateInput
            name="dob"
            aria-label="Date of birth"
            defaultValue="1985-03-12"
          />
        </form>,
        { locale: 'it' },
      );
      await browser.fill(screen.getByRole('textbox'), '01/01/2000');
      expect(carrier(container).value).toBe('2000-01-01');

      const form = container.querySelector('form') as HTMLFormElement;
      form.reset();

      expect(carrier(container).value).toBe('1985-03-12');
      expect(screen.getByRole('textbox')).toHaveValue('12/03/1985');
    });

    it('keeps the carrier out of the tab order and the accessibility tree', () => {
      const { container } = renderUi(
        <DateInput name="dob" aria-label="Date of birth" />,
        { locale: 'it' },
      );
      const hidden = carrier(container);
      expect(hidden).toHaveAttribute('hidden');
      expect(hidden).toHaveAttribute('aria-hidden', 'true');
      expect(hidden).toHaveAttribute('tabindex', '-1');
    });

    it('never marks the carrier required, which would refuse the submit invisibly', () => {
      const { container } = renderUi(
        <DateInput name="dob" aria-label="Date of birth" required />,
        { locale: 'it' },
      );
      expect(carrier(container)).not.toBeRequired();
      expect(screen.getByRole('textbox')).toBeRequired();
    });

    it('disables the carrier with the field, so nothing is posted for it', () => {
      const { container } = renderUi(
        <DateInput name="dob" aria-label="Date of birth" disabled />,
        { locale: 'it' },
      );
      expect(carrier(container)).toBeDisabled();
    });
  });

  describe('it composes like Input', () => {
    it('takes its name and wiring from a Field', () => {
      renderUi(
        <Field label="Date of birth" hint="As it appears on your passport.">
          <DateInput name="dob" />
        </Field>,
        { locale: 'en-GB' },
      );
      const field = screen.getByRole('textbox', { name: 'Date of birth' });
      expect(field).toHaveAccessibleDescription(
        'As it appears on your passport.',
      );
    });

    it('forwards ref to the visible input', () => {
      let node: HTMLInputElement | null = null;
      renderUi(
        <DateInput
          name="dob"
          aria-label="Date of birth"
          ref={(element) => {
            node = element;
          }}
        />,
        { locale: 'it' },
      );
      expect(node).toBe(screen.getByRole('textbox'));
    });

    it('has no accessibility violations', async () => {
      const { container } = renderUi(
        <Field label="Date of birth">
          <DateInput name="dob" />
        </Field>,
        { locale: 'it' },
      );
      await expectNoA11yViolations(container);
    });
  });
});

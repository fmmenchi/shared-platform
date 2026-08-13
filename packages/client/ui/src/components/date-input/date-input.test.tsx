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

    it('takes whatever separator a keyboard offers, and shows the locale one', async () => {
      const { container } = renderUi(
        <DateInput name="dob" aria-label="Date of birth" />,
        { locale: 'it' },
      );
      for (const typed of ['12-08-2026', '12.08.2026', '12 08 2026']) {
        await browser.fill(screen.getByRole('textbox'), typed);
        expect(carrier(container).value).toBe('2026-08-12');
        // Dropped rather than accepted as an alternative: the field shows the
        // separator the locale writes, whatever was pressed to get there.
        expect(screen.getByRole('textbox')).toHaveValue('12/08/2026');
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

  describe('the mask lets only a date be typed', () => {
    it('inserts the locale separator on its own', async () => {
      renderUi(<DateInput name="dob" aria-label="Date of birth" />, {
        locale: 'it',
      });
      await browser.fill(screen.getByRole('textbox'), '12082026');
      expect(screen.getByRole('textbox')).toHaveValue('12/08/2026');
    });

    it('inserts the separator the LOCALE writes, in its own places', async () => {
      renderUi(<DateInput name="dob" aria-label="Date of birth" />, {
        locale: 'ja-JP',
      });
      await browser.fill(screen.getByRole('textbox'), '20260812');
      expect(screen.getByRole('textbox')).toHaveValue('2026/08/12');
    });

    it('refuses letters outright', async () => {
      renderUi(<DateInput name="dob" aria-label="Date of birth" />, {
        locale: 'it',
      });
      await browser.fill(screen.getByRole('textbox'), 'ciao');
      expect(screen.getByRole('textbox')).toHaveValue('');
    });

    it('keeps the digits out of a string that also has letters', async () => {
      renderUi(<DateInput name="dob" aria-label="Date of birth" />, {
        locale: 'it',
      });
      await browser.fill(screen.getByRole('textbox'), '1a2b0c8d2026');
      expect(screen.getByRole('textbox')).toHaveValue('12/08/2026');
    });

    it('waits while a part could still grow', async () => {
      renderUi(<DateInput name="dob" aria-label="Date of birth" />, {
        locale: 'it',
      });
      // `4` is a fine month on its own — April — and might yet become `04`.
      await browser.fill(screen.getByRole('textbox'), '124');
      expect(screen.getByRole('textbox')).toHaveValue('12/4');
    });

    it('advances rather than eats when the next digit cannot fit', async () => {
      renderUi(<DateInput name="dob" aria-label="Date of birth" />, {
        locale: 'it',
      });
      // `45` is no month, so `4` closes as April and the `5` starts the year.
      // The alternative — dropping the `5` — is what destroyed a date on one
      // Backspace, so this is the assertion that keeps it gone.
      await browser.fill(screen.getByRole('textbox'), '1245');
      expect(screen.getByRole('textbox')).toHaveValue('12/04/5');
    });

    it('survives a Backspace in the middle without losing the date', async () => {
      const { container } = renderUi(
        <DateInput name="dob" aria-label="Date of birth" />,
        { locale: 'it' },
      );
      const field = screen.getByRole('textbox');
      await browser.fill(field, '12082026');
      expect(field).toHaveValue('12/08/2026');

      // The most ordinary correction there is: put the caret after the day and
      // rub out one digit. This once produced `10/8` — seven digits of eight
      // gone, silently.
      await browser.fill(field, '1/08/2026');
      expect(field).toHaveValue('10/08/2026');
      expect(carrier(container).value).toBe('2026-08-10');
    });

    it('never lets a day reach 32', async () => {
      renderUi(<DateInput name="dob" aria-label="Date of birth" />, {
        locale: 'it',
      });
      // The `3` closes as the 3rd and the `2` opens the month, which is what
      // someone typing `3` then `2` meant. What it must never be is `32`.
      await browser.fill(screen.getByRole('textbox'), '32');
      expect(screen.getByRole('textbox')).toHaveValue('03/2');
    });

    it('stops at a whole date, however much is pasted', async () => {
      renderUi(<DateInput name="dob" aria-label="Date of birth" />, {
        locale: 'it',
      });
      await browser.fill(screen.getByRole('textbox'), '120820269999');
      expect(screen.getByRole('textbox')).toHaveValue('12/08/2026');
    });

    it('keeps every digit of a long paste, which is why there is no maxLength', async () => {
      const { container } = renderUi(
        <DateInput name="dob" aria-label="Date of birth" />,
        { locale: 'it' },
      );
      // What an API hands you. A `maxLength` sized for `gg/mm/aaaa` would cut
      // this at ten characters and silently lose the day — measured.
      await browser.fill(screen.getByRole('textbox'), '12/08/2026T00:00:00Z');
      expect(screen.getByRole('textbox')).toHaveValue('12/08/2026');
      expect(carrier(container).value).toBe('2026-08-12');
    });
  });

  describe('locales the ASCII assumption used to break', () => {
    it('reads and writes the locale own numerals', async () => {
      const { container } = renderUi(
        <DateInput name="dob" aria-label="تاريخ الميلاد" />,
        { locale: 'ar-EG' },
      );
      const field = screen.getByRole('textbox');
      // What an Arabic keyboard sends. This used to be filtered out character
      // by character AS THE USER TYPED, leaving the field permanently empty.
      await browser.fill(field, '١٢٠٨٢٠٢٦');
      expect(carrier(container).value).toBe('2026-08-12');
      // And it comes back in the same numerals the `Time` beside it uses, not
      // in ASCII.
      expect(field).toHaveValue('١٢/٠٨/٢٠٢٦');
    });

    it('shows a seeded date in the locale own numerals', () => {
      renderUi(
        <DateInput
          name="dob"
          aria-label="تاريخ الميلاد"
          defaultValue="2026-08-12"
        />,
        { locale: 'ar-EG' },
      );
      expect(screen.getByRole('textbox')).toHaveValue('١٢/٠٨/٢٠٢٦');
    });

    it('stays Gregorian where the locale calendar is not', () => {
      renderUi(
        <DateInput name="dob" aria-label="Date" defaultValue="2026-08-12" />,
        { locale: 'th-TH' },
      );
      // Thai is Buddhist by default: unpinned, the pattern was Buddhist and the
      // numbers were ours, so `2569` on the page and `2569` typed into the
      // field stored a Gregorian 2569 — 543 years out, in silence.
      expect(screen.getByRole('textbox')).toHaveValue('12/08/2026');
    });

    it('writes the separator the locale writes, not a slash', async () => {
      renderUi(<DateInput name="dob" aria-label="Geburtsdatum" />, {
        locale: 'de-DE',
      });
      await browser.fill(screen.getByRole('textbox'), '12082026');
      expect(screen.getByRole('textbox')).toHaveValue('12.08.2026');
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

    it('keeps the carrier out of the accessibility tree', () => {
      renderUi(<DateInput name="dob" aria-label="Date of birth" />, {
        locale: 'it',
      });
      // One field, not two: the carrier is `aria-hidden`, so nothing announces
      // a second textbox holding an ISO string nobody typed.
      expect(screen.getAllByRole('textbox')).toHaveLength(1);
    });

    it('sends focus on to the visible field when something focuses the carrier', () => {
      const { container } = renderUi(
        <DateInput name="dob" aria-label="Date of birth" />,
        { locale: 'it' },
      );
      // This is what `FormErrorSummary` does: find the field by `name` — which
      // is on the carrier — and focus it. Focused, the carrier hands focus
      // straight on, so a keyboard user lands somewhere they can see and type.
      carrier(container).focus();
      expect(screen.getByRole('textbox')).toHaveFocus();
    });

    it('keeps the carrier out of the tab order', () => {
      const { container } = renderUi(
        <DateInput name="dob" aria-label="Date of birth" />,
        { locale: 'it' },
      );
      expect(carrier(container)).toHaveAttribute('tabindex', '-1');
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
        <form>
          <DateInput
            name="dob"
            aria-label="Date of birth"
            defaultValue="1985-03-12"
            disabled
          />
        </form>,
        { locale: 'it' },
      );
      expect(carrier(container)).toBeDisabled();
      // The claim in the title, asserted rather than implied: a disabled control
      // is not submitted.
      const form = container.querySelector('form') as HTMLFormElement;
      expect(new FormData(form).getAll('dob')).toEqual([]);
    });

    it('refuses to carry a defaultValue that is not an ISO date', () => {
      const { container } = renderUi(
        <form>
          <DateInput
            name="dob"
            aria-label="Date of birth"
            defaultValue="12/08/2026"
          />
        </form>,
        { locale: 'it' },
      );
      // Seeded raw, the field showed empty and the form posted `12/08/2026` —
      // out of the component whose first promise is that a server never has to
      // guess which number is the month.
      expect(screen.getByRole('textbox')).toHaveValue('');
      const form = container.querySelector('form') as HTMLFormElement;
      expect(new FormData(form).getAll('dob')).toEqual(['']);
    });

    it('never lets a part be all zeros, at either end', async () => {
      const { container } = renderUi(
        <DateInput name="dob" aria-label="Date of birth" />,
        { locale: 'it' },
      );
      const field = screen.getByRole('textbox');
      // `00/00/2026` used to be typeable in full: complete-looking, storing
      // nothing, with nothing to say why.
      await browser.fill(field, '00002026');
      expect(field).not.toHaveValue('00/00/2026');
      expect(carrier(container).value).toBe('');

      await browser.fill(field, '12080000');
      expect(carrier(container).value).toBe('');
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

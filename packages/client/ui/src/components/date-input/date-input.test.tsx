import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { DateInput } from './date-input.component.js';
import { Field } from '../field/field.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

/**
 * 12 August 2026 as `ar-EG` writes it — bidi marks and all.
 *
 * Taken from `Intl` rather than typed out, because that is the claim: the field
 * must render what every other date on the page renders, and the two invisible
 * U+200F marks in it are what put the three groups in the right visual order.
 */
const arabicDate = new Intl.DateTimeFormat('ar-EG', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'UTC',
  calendar: 'gregory',
}).format(new Date(Date.UTC(2026, 7, 12)));

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

    it('seeds from a day on its own', () => {
      const { container } = renderUi(
        <DateInput
          name="dob"
          aria-label="Date of birth"
          defaultDate={{ year: 2000, month: 1, day: 5 }}
        />,
        { locale: 'it' },
      );
      // Every other `defaultDate` test passed a `defaultValue` too — which
      // wins — so deleting the feature outright changed no assertion.
      expect(screen.getByRole('textbox')).toHaveValue('05/01/2000');
      expect(carrier(container).value).toBe('2000-01-05');
    });

    it('says so when the day it was seeded with does not exist', () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      renderUi(
        <DateInput
          name="dob"
          aria-label="Date of birth"
          defaultDate={{ year: 2026, month: 2, day: 30 }}
        />,
        { locale: 'it' },
      );
      expect(screen.getByRole('textbox')).toHaveValue('');
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('does not name a day that exists'),
      );
      warn.mockRestore();
    });

    it('lets the call site replace the format hint', () => {
      renderUi(
        <DateInput name="dob" aria-label="Date of birth" placeholder="—" />,
        { locale: 'it' },
      );
      expect(screen.getByRole('textbox')).toHaveAttribute('placeholder', '—');
    });

    it('seeds from a datetime by taking the day it names', () => {
      const { container } = renderUi(
        <form>
          <DateInput
            name="dob"
            aria-label="Date of birth"
            defaultValue="2026-08-12T00:00:00.000Z"
          />
        </form>,
        { locale: 'it' },
      );

      // The door consumers use most, and the one the "one grammar" repair
      // missed: a form library's `defaultValues` holding what somebody stored
      // as a `Date`. Measured before this: the box was empty, the carrier held
      // the instant, and the form posted it.
      expect(screen.getByRole('textbox')).toHaveValue('12/08/2026');
      expect(carrier(container).value).toBe('2026-08-12');
      const form = container.querySelector('form') as HTMLFormElement;
      expect(new FormData(form).getAll('dob')).toEqual(['2026-08-12']);
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
      // And it comes back as EXACTLY what `Intl` renders for that day — which is
      // what `Time` and a formatted `Table` cell beside it render. Asserted as
      // the relationship rather than as a literal, because the literal carries
      // two invisible U+200F marks: stripping those (which an earlier version
      // did) laid the field out in the OPPOSITE visual order from every date
      // around it, and no string comparison written by hand would have shown it.
      expect(field).toHaveValue(arabicDate);
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
      expect(screen.getByRole('textbox')).toHaveValue(arabicDate);
    });

    it('stays Gregorian where the locale carries another calendar', () => {
      renderUi(
        <DateInput name="dob" aria-label="Date" defaultValue="2026-08-12" />,
        { locale: 'ja-JP-u-ca-japanese' },
      );
      // The locale a pin can actually be SEEN in. `th-TH` was the first choice
      // and it could not fail: Buddhist and Gregorian differ there only in the
      // year VALUE, which this component fills from its own parse — so the test
      // passed with the pin removed. A `-u-ca-` locale differs in the PARTS:
      // unpinned this yields an `era`, and the field showed `R2026/08/12`, a
      // Gregorian year stamped with an era that contradicts it.
      expect(screen.getByRole('textbox')).toHaveValue('2026/08/12');
    });

    it('writes the separator the locale writes, not a slash', async () => {
      renderUi(<DateInput name="dob" aria-label="Geburtsdatum" />, {
        locale: 'de-DE',
      });
      await browser.fill(screen.getByRole('textbox'), '12082026');
      expect(screen.getByRole('textbox')).toHaveValue('12.08.2026');
    });
  });

  describe('typed one key at a time, which is the only way the caret is real', () => {
    // Every other test in this file uses `fill`, which replaces the whole value
    // in one operation — so the mask never runs on its own output and the caret
    // is never anywhere but the end. That blind spot hid a defect that stored a
    // WRONG BUT VALID date on more than half of all short-form entries.

    it('stores what was meant when the parts are typed without leading zeros', async () => {
      const { container } = renderUi(
        <DateInput name="dob" aria-label="Date of birth" />,
        { locale: 'en-US' },
      );
      // 12 August 2026, typed the way a person types it: `8`, `12`, `2026`.
      // This came out as `08/22/0261` — carrier `0261-08-22` — because the
      // caret sat in front of the zero the mask had just padded in.
      await browser.type(screen.getByRole('textbox'), '8122026');
      expect(screen.getByRole('textbox')).toHaveValue('08/12/2026');
      expect(carrier(container).value).toBe('2026-08-12');
    });

    it('does the same where the year leads', async () => {
      const { container } = renderUi(
        <DateInput name="dob" aria-label="Date of birth" />,
        { locale: 'ja-JP' },
      );
      // `2026`, `2`, `10` — 10 February. Both this and the date it used to
      // store, 1 February, exist, which is what made it invisible.
      await browser.type(screen.getByRole('textbox'), '2026210');
      expect(carrier(container).value).toBe('2026-02-10');
    });

    it('deletes one digit from the part it was in, leaving the others alone', async () => {
      const { container } = renderUi(
        <DateInput name="dob" aria-label="Date of birth" />,
        { locale: 'it' },
      );
      const field = screen.getByRole('textbox') as HTMLInputElement;
      await browser.fill(field, '12082026');
      expect(field).toHaveValue('12/08/2026');

      // Caret after the day, one Backspace. Re-flowed, this produced
      // `10/08/2026` — a different real day, submitted in silence.
      field.setSelectionRange(2, 2);
      await browser.keyboard('{Backspace}');

      expect(field.value).toBe('1/08/2026');
      expect(carrier(container).value).toBe('');
    });

    it('takes the digit in front of a separator when the separator is deleted', async () => {
      renderUi(<DateInput name="dob" aria-label="Date of birth" />, {
        locale: 'it',
      });
      const field = screen.getByRole('textbox') as HTMLInputElement;
      await browser.fill(field, '12082026');

      // Backspace with the caret just past the `/`. A separator has no digits of
      // its own, so re-emitting the mask left the text identical and the key did
      // nothing — for ever, however many times it was pressed.
      field.setSelectionRange(3, 3);
      await browser.keyboard('{Backspace}');

      expect(field.value).toBe('1/08/2026');
    });

    it('advances the caret when the frame is already full', async () => {
      // FOUND FROM THE TIME FIELD, AND IT WAS HERE ALL ALONG. Typing in front of
      // a whole date overflows the frame; the mask drops the surplus off the
      // right, and the right-anchored caret slipped one place left with it —
      // back to the start after every keystroke, so each digit was inserted in
      // front of the last. Measured: `01011999` typed at the head of a full
      // `12/08/2026` walked through four different real dates and stored the
      // last of them in silence.
      renderUi(<DateInput name="dob" aria-label="Date of birth" />, {
        locale: 'it',
      });
      const field = screen.getByRole('textbox') as HTMLInputElement;
      await browser.fill(field, '12082026');

      field.setSelectionRange(0, 0);
      await browser.keyboard('01011999');

      expect(field.value).toBe('01/01/1999');
    });

    it('can be emptied from the keyboard', async () => {
      const { container } = renderUi(
        <DateInput name="dob" aria-label="Date of birth" />,
        { locale: 'it' },
      );
      const field = screen.getByRole('textbox') as HTMLInputElement;
      await browser.fill(field, '12082026');

      field.setSelectionRange(field.value.length, field.value.length);
      // Ten presses for ten characters. Held down, this used to stop dead at
      // `12/08/` — the field could not be cleared without select-all.
      for (let press = 0; press < 10; press += 1) {
        await browser.keyboard('{Backspace}');
      }

      expect(field.value).toBe('');
      expect(carrier(container).value).toBe('');
    });

    it('keeps the caret behind the digit just typed, not in front of it', async () => {
      renderUi(<DateInput name="dob" aria-label="Date of birth" />, {
        locale: 'it',
      });
      const field = screen.getByRole('textbox') as HTMLInputElement;
      await browser.type(field, '12');
      // Past the separator the mask inserted, so the next key starts the month
      // rather than landing in front of the slash.
      expect(field.value).toBe('12/');
      expect(field.selectionStart).toBe(3);
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

    it('reports the RESTORED date after a reset button, not the discarded one', async () => {
      const onDateChange = vi.fn();
      const { container } = renderUi(
        <form>
          <DateInput
            name="dob"
            aria-label="Date of birth"
            defaultValue="1985-03-12"
            onDateChange={onDateChange}
          />
          <button type="reset">Annulla</button>
        </form>,
        { locale: 'it' },
      );
      await browser.fill(screen.getByRole('textbox'), '01012000');
      onDateChange.mockClear();

      // NOT `form.reset()`, and the values are not what this test is for: the
      // visible field is inside the form, so the platform reverts it either
      // way. What only OUR code can get wrong is WHEN it looks. The browser
      // runs a button's reset from its activation behaviour with the JS stack
      // empty, so a microtask checkpoint lands BEFORE the revert — measured,
      // the first version read the typed date there and announced it as the
      // new one, driving a picker's grid onto a date that had just been thrown
      // away.
      await browser.click(screen.getByRole('button', { name: 'Annulla' }));

      expect(onDateChange).toHaveBeenLastCalledWith({
        year: 1985,
        month: 3,
        day: 12,
      });
      expect(carrier(container).value).toBe('1985-03-12');
    });

    it('repaints the field on a reset even when it is OUTSIDE its form', async () => {
      const { container } = renderUi(
        <>
          <form id="altrove">
            <button type="reset">Annulla</button>
          </form>
          <DateInput
            name="dob"
            aria-label="Date of birth"
            form="altrove"
            defaultValue="1985-03-12"
          />
        </>,
        { locale: 'it' },
      );
      await browser.fill(screen.getByRole('textbox'), '01012000');

      // `form=` lives on the CARRIER only — it is the node with the name, and
      // the one the form must own. So the visible field is not form-associated
      // and the platform does not revert it: measured, the user was left
      // reading `01/01/2000` while the form held `1985-03-12` and would have
      // submitted it. That is the silent disagreement this whole family exists
      // to prevent, in the one arrangement `form=` exists for — a portal, a
      // dialog, a sticky footer.
      await browser.click(screen.getByRole('button', { name: 'Annulla' }));

      expect(carrier(container).value).toBe('1985-03-12');
      expect(screen.getByRole('textbox')).toHaveValue('12/03/1985');
    });

    it('repaints the field when the form it SITS IN is reset and its own is not', async () => {
      // The mirror of the case above, and the one the door used to miss: the
      // carrier is bound to `altrove` by `form=`, but the VISIBLE field has no
      // name and therefore belongs to the form it sits in. The platform reverts
      // each control through its own form, so a reset of `qui` put the box back
      // to the seed and left the carrier on the typed value — `altrove` would
      // have posted a date that was not on screen.
      const { container } = renderUi(
        <>
          <form id="altrove" />
          <form id="qui">
            <DateInput
              name="dob"
              aria-label="Date of birth"
              form="altrove"
              defaultValue="1985-03-12"
            />
            <button type="reset">Annulla</button>
          </form>
        </>,
        { locale: 'it' },
      );
      await browser.fill(screen.getByRole('textbox'), '01012000');

      await browser.click(screen.getByRole('button', { name: 'Annulla' }));

      // The value belongs to `altrove`, which was not reset, so it stands — and
      // the box goes back to showing it rather than the seed the platform put
      // there.
      await vi.waitFor(() => {
        expect(screen.getByRole('textbox')).toHaveValue('01/01/2000');
      });
      expect(carrier(container).value).toBe('2000-01-01');
    });

    it('can still be edited after a reset, rather than emptying on one Backspace', async () => {
      // `shown` is what the deletion path reads as "the text before this
      // keystroke". On a reset the platform reverts the visible field itself, so
      // the repaint below is a no-op — and while `shown` was recorded only
      // INSIDE that repaint, it kept the text that had just been discarded.
      // Measured: the box correctly returned to `12/03/1985`, then one
      // Backspace emptied the whole field, because the deletion was mapped onto
      // a string with nothing in common with it.
      const { container } = renderUi(
        <form>
          <DateInput
            name="dob"
            aria-label="Date of birth"
            defaultValue="1985-03-12"
          />
          <button type="reset">Annulla</button>
        </form>,
        { locale: 'it' },
      );
      const field = screen.getByRole('textbox') as HTMLInputElement;
      await browser.fill(field, '01012000');

      await browser.click(screen.getByRole('button', { name: 'Annulla' }));
      await vi.waitFor(() => {
        expect(field).toHaveValue('12/03/1985');
      });

      // Focus is on the BUTTON after that click, and a keystroke goes where the
      // focus is — a test that forgot this would be typing into the reset.
      await browser.click(field);
      field.setSelectionRange(field.value.length, field.value.length);
      await browser.keyboard('{Backspace}');

      expect(field).toHaveValue('12/03/198');
      expect(carrier(container).value).toBe('');
    });

    it('still follows an external clear after a reset', async () => {
      // The second symptom of the same staleness: an empty carrier is only
      // obeyed when what is on screen is WHOLE, and that question was being
      // asked about the discarded text. Measured: half-typed, then reset, then
      // `setValue(name, '')` — the carrier emptied and the box went on showing
      // a date the form no longer held.
      const { container } = renderUi(
        <form>
          <DateInput
            name="dob"
            aria-label="Date of birth"
            defaultValue="1985-03-12"
          />
          <button type="reset">Annulla</button>
        </form>,
        { locale: 'it' },
      );
      const field = screen.getByRole('textbox') as HTMLInputElement;
      await browser.fill(field, '0101');
      expect(field).toHaveValue('01/01/');

      await browser.click(screen.getByRole('button', { name: 'Annulla' }));
      await vi.waitFor(() => {
        expect(field).toHaveValue('12/03/1985');
      });

      carrier(container).value = '';
      await vi.waitFor(() => {
        expect(field).toHaveValue('');
      });
    });

    it('says so when something writes it a value it cannot show', async () => {
      // The setter commits the assignment before this component sees it, so the
      // form posts whatever arrived. Reverting is not this component's call —
      // the write came from outside with intent — but going silent is: the SEED
      // path warns for this exact string, and the door did not.
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      const { container } = renderUi(
        <DateInput
          name="dob"
          aria-label="Date of birth"
          defaultValue="1985-03-12"
        />,
        { locale: 'it' },
      );

      carrier(container).value = 'tomorrow';

      await vi.waitFor(() => {
        expect(warn).toHaveBeenCalledWith(
          expect.stringContaining('does not name anything it can show'),
        );
      });
      // Unchanged, and that is the point of the warning: the box and the form
      // disagree, and nobody but this line would ever say so.
      expect(screen.getByRole('textbox')).toHaveValue('12/03/1985');
      warn.mockRestore();
    });

    it('follows a clear written as null, which is what a library writes', async () => {
      // `HTMLInputElement.value` is declared `[LegacyNullToEmptyString]`, so
      // `node.value = null` puts `''` in the DOM — but the door was handed the
      // ARGUMENT, stringified, and so saw the literal `'null'`. Measured: the
      // carrier went empty, the box went on showing `12/03/1985`, and the
      // consumer was told nothing at all.
      const told = vi.fn();
      const { container } = renderUi(
        <DateInput
          name="dob"
          aria-label="Date of birth"
          defaultValue="1985-03-12"
          onDateChange={told}
        />,
        { locale: 'it' },
      );

      (carrier(container) as unknown as { value: unknown }).value = null;

      await vi.waitFor(() => {
        expect(screen.getByRole('textbox')).toHaveValue('');
      });
      expect(carrier(container).value).toBe('');
      expect(told).toHaveBeenLastCalledWith(null);
    });

    it('leaves a half-typed field alone when the page REFUSES the reset', async () => {
      renderUi(
        <form onReset={(event) => event.preventDefault()}>
          <DateInput name="dob" aria-label="Date of birth" />
          <button type="reset">Annulla</button>
        </form>,
        { locale: 'it' },
      );
      await browser.fill(screen.getByRole('textbox'), '0101');
      expect(screen.getByRole('textbox')).toHaveValue('01/01/');

      // The page asked "are you sure?" and said no. The revert never happened,
      // so there is nothing to follow — and the field was emptied anyway,
      // because the reset door wipes a half-typed value on purpose (a reset to
      // an empty default must clear it) and never asked whether the reset had
      // been called off.
      await browser.click(screen.getByRole('button', { name: 'Annulla' }));

      expect(screen.getByRole('textbox')).toHaveValue('01/01/');
    });

    it('clears a half-typed field when the reset DOES happen', async () => {
      const { container } = renderUi(
        <form>
          <DateInput name="dob" aria-label="Date of birth" />
          <button type="reset">Annulla</button>
        </form>,
        { locale: 'it' },
      );
      await browser.fill(screen.getByRole('textbox'), '0101');

      // The other side of the same branch, which nothing covered: reverting to
      // an empty default has to empty the box too, and a half-typed value is
      // exactly the case the ordinary clear guard refuses to touch.
      await browser.click(screen.getByRole('button', { name: 'Annulla' }));

      expect(screen.getByRole('textbox')).toHaveValue('');
      expect(carrier(container).value).toBe('');
    });

    it('takes a datetime the same way whether it is pasted or assigned', async () => {
      const onDateChange = vi.fn();
      const { container } = renderUi(
        <form>
          <DateInput
            name="dob"
            aria-label="Date of birth"
            onDateChange={onDateChange}
          />
        </form>,
        { locale: 'it' },
      );

      // What `Date.prototype.toISOString()` gives, and therefore what a
      // consumer writes without thinking about it. The mask has always taken a
      // PASTED one as the day it names; an ASSIGNED one went through the strict
      // parser instead, failed, and left the field empty while the carrier held
      // the instant — so `setValue('dob', d.toISOString())` posted a datetime
      // the field had never shown. Two grammars, disagreeing.
      carrier(container).value = '2026-08-12T00:00:00.000Z';

      expect(screen.getByRole('textbox')).toHaveValue('12/08/2026');
      // …and the carrier is brought with it, so what the form posts is the day
      // on screen and not the instant. A date field holding an instant is the
      // conflation this family exists to refuse: `2026-08-12T23:00:00Z` is two
      // different days depending on where you stand.
      expect(carrier(container).value).toBe('2026-08-12');
      const form = container.querySelector('form') as HTMLFormElement;
      expect(new FormData(form).getAll('dob')).toEqual(['2026-08-12']);
      expect(onDateChange).toHaveBeenLastCalledWith({
        year: 2026,
        month: 8,
        day: 12,
      });
    });

    it('repaints when a form library ASSIGNS the carrier, which fires no event', async () => {
      const { container } = renderUi(
        <DateInput name="dob" aria-label="Date of birth" />,
        { locale: 'it' },
      );

      // Exactly what react-hook-form's `setValue` and `reset` do: assign onto
      // the element `register()` was given a ref to. No event, no mutation
      // record, and — for a binding that only calls `register()` — no render
      // either, so nothing else in this component can see it happen. Only the
      // property being assigned to can, which is why the carrier's `value`
      // descriptor is wrapped.
      carrier(container).value = '2026-08-12';

      expect(screen.getByRole('textbox')).toHaveValue('12/08/2026');
    });

    it('does not wipe a half-typed field when a library clears the carrier', async () => {
      const { container } = renderUi(
        <DateInput name="dob" aria-label="Date of birth" />,
        { locale: 'it' },
      );
      await browser.fill(screen.getByRole('textbox'), '1208');

      // A validation pass clearing the field mid-edit must not pull the digits
      // out from under the caret: an empty carrier is ALSO what a half-typed
      // field looks like, so the two cannot be told apart from here.
      carrier(container).value = '';

      expect(screen.getByRole('textbox')).toHaveValue('12/08/');
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
      // The hint AND the format, in that order — this used to assert the hint
      // alone, which is what the suppression bug looked like from the inside.
      expect(field).toHaveAccessibleDescription(
        /As it appears on your passport\..*dd\/mm\/yyyy/,
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

    it('announces the format even when a Field supplies a hint', () => {
      renderUi(
        <Field label="Date of birth" hint="As it appears on your passport.">
          <DateInput name="dob" />
        </Field>,
        { locale: 'it' },
      );
      // The format used to live only in the `placeholder`, which is the LAST
      // source an accessible description falls back to — so the moment a hint or
      // an error existed, `aria-describedby` won and the format was announced
      // nowhere. It is now a description of its own, and `Field` merges rather
      // than replaces.
      expect(
        screen.getByRole('textbox', { name: 'Date of birth' }),
      ).toHaveAccessibleDescription(/gg\/mm\/aaaa/);
      expect(
        screen.getByRole('textbox', { name: 'Date of birth' }),
      ).toHaveAccessibleDescription(/As it appears on your passport\./);
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

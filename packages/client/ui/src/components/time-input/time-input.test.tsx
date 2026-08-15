import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { TimeInput } from './time-input.component.js';
import { UiProvider } from '../../i18n/provider.js';
import { Field } from '../field/field.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

/**
 * Half past two in the afternoon as `ar-EG` writes it — Arabic digits, Arabic
 * day period, bidi marks and all.
 *
 * Taken from `Intl` rather than typed out, because that is the claim: the field
 * must render what every `Time` on the page renders.
 */
const arabicAfternoon = new Intl.DateTimeFormat('ar-EG', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
}).format(new Date(Date.UTC(2026, 7, 12, 14, 30)));

/** The carrier: hidden, so it is reachable only as a raw node. */
function carrier(container: HTMLElement): HTMLInputElement {
  const node = container.querySelector('[data-carrier]');
  if (node === null) throw new Error('no carrier in the rendered output');
  return node as HTMLInputElement;
}

describe('TimeInput', () => {
  describe('it is one field, read in the cycle the locale reads', () => {
    it('is a single textbox, not two and not three', () => {
      renderUi(<TimeInput name="opens" aria-label="Opens at" />, {
        locale: 'it',
      });
      expect(screen.getAllByRole('textbox')).toHaveLength(1);
    });

    it('shows a twenty-four-hour locale the reading it writes', () => {
      renderUi(
        <TimeInput name="opens" aria-label="Opens at" defaultValue="14:30" />,
        { locale: 'it' },
      );
      expect(screen.getByRole('textbox')).toHaveValue('14:30');
    });

    it('shows the SAME time as half past two in the afternoon for en-US', () => {
      // THE WHOLE REASON THIS COMPONENT EXISTS. `input[type=time]` draws `14:30`
      // here whatever the page declares, beside a `Time` saying `02:30 PM`.
      renderUi(
        <TimeInput name="opens" aria-label="Opens at" defaultValue="14:30" />,
        { locale: 'en-US' },
      );
      expect(screen.getByRole('textbox')).toHaveValue('02:30 PM');
    });

    it('shows it in Arabic digits and the Arabic day period for ar-EG', () => {
      renderUi(
        <TimeInput name="opens" aria-label="Opens at" defaultValue="14:30" />,
        { locale: 'ar-EG' },
      );
      expect(screen.getByRole('textbox')).toHaveValue(arabicAfternoon);
    });

    it('stores HH:mm whatever it showed', () => {
      const { container } = renderUi(
        <TimeInput name="opens" aria-label="Opens at" defaultValue="14:30" />,
        { locale: 'en-US' },
      );
      // The field says `02:30 PM`; a server is never asked to work out which
      // half of the day that was.
      expect(carrier(container)).toHaveValue('14:30');
    });

    it('takes the hour cycle from a prop when the locale cannot know', () => {
      // A timetable reads twenty-four-hour whatever the page's language is.
      renderUi(
        <TimeInput
          name="departs"
          aria-label="Departs"
          defaultValue="14:30"
          hourCycle="h23"
        />,
        { locale: 'en-US' },
      );
      expect(screen.getByRole('textbox')).toHaveValue('14:30');
    });
  });

  describe('typing', () => {
    it('puts the separator in on its own', async () => {
      renderUi(<TimeInput name="opens" aria-label="Opens at" />, {
        locale: 'it',
      });
      const field = screen.getByRole('textbox');
      await browser.click(field);
      await browser.keyboard('1430');
      expect(field).toHaveValue('14:30');
    });

    it('refuses an hour the cycle cannot write, and keeps the digit', async () => {
      // `9` cannot start an hour in a twenty-four-hour field beyond 23, so `95`
      // is 09:5… — the digit starts the minute rather than being swallowed.
      renderUi(<TimeInput name="opens" aria-label="Opens at" />, {
        locale: 'it',
      });
      const field = screen.getByRole('textbox');
      await browser.click(field);
      await browser.keyboard('95');
      expect(field).toHaveValue('09:5');
    });

    it('refuses a thirteenth hour in a twelve-hour field', async () => {
      const { container } = renderUi(
        <TimeInput name="opens" aria-label="Opens at" />,
        { locale: 'en-US' },
      );
      const field = screen.getByRole('textbox');
      await browser.click(field);
      await browser.keyboard('13');
      // `1` then `3`: 13 is past the twelve-hour ceiling, so the hour closes at
      // 01 and the 3 starts the minute.
      expect(field).toHaveValue('01:3');
      expect(carrier(container)).toHaveValue('');
    });

    it('names nothing until the half of the day is chosen', async () => {
      // THE SILENT DEFAULT REFUSED. `02:30` with an unspoken AM is a
      // wrong-but-valid value; the field says what is missing instead.
      const told = vi.fn();
      const { container } = renderUi(
        <TimeInput name="opens" aria-label="Opens at" onTimeChange={told} />,
        { locale: 'en-US' },
      );
      const field = screen.getByRole('textbox');
      await browser.click(field);
      await browser.keyboard('0230');
      expect(field).toHaveValue('02:30 AM/PM');
      expect(carrier(container)).toHaveValue('');
      expect(told).toHaveBeenLastCalledWith(null);
    });

    it('takes the half of the day from a letter, and stores the right hour', async () => {
      const { container } = renderUi(
        <TimeInput name="opens" aria-label="Opens at" />,
        { locale: 'en-US' },
      );
      const field = screen.getByRole('textbox');
      await browser.click(field);
      await browser.keyboard('0230p');
      expect(field).toHaveValue('02:30 PM');
      expect(carrier(container)).toHaveValue('14:30');
    });

    it('lets the half of the day be changed after the fact', async () => {
      const { container } = renderUi(
        <TimeInput name="opens" aria-label="Opens at" />,
        { locale: 'en-US' },
      );
      const field = screen.getByRole('textbox');
      await browser.click(field);
      await browser.keyboard('0230p');
      await browser.keyboard('a');
      expect(field).toHaveValue('02:30 AM');
      expect(carrier(container)).toHaveValue('02:30');
    });

    it('reads twelve as midnight and as noon, which is where a % 12 is wrong', async () => {
      const { container } = renderUi(
        <TimeInput name="opens" aria-label="Opens at" />,
        { locale: 'en-US' },
      );
      const field = screen.getByRole('textbox');
      await browser.click(field);
      await browser.keyboard('1200a');
      expect(carrier(container)).toHaveValue('00:00');
      await browser.keyboard('p');
      expect(carrier(container)).toHaveValue('12:00');
    });

    it('accepts an Arabic keyboards own digits', async () => {
      const { container } = renderUi(
        <TimeInput name="opens" aria-label="Opens at" />,
        { locale: 'ar-EG' },
      );
      const field = screen.getByRole('textbox');
      await browser.click(field);
      await browser.keyboard('٠٩٣٠');
      // Latin `a`/`p` are offered beside the locale's own words, because a
      // keyboard is not a locale.
      await browser.keyboard('p');
      expect(carrier(container)).toHaveValue('21:30');
    });

    it('takes the half of the day from the locales own word', async () => {
      // THE FIELD MUST ACCEPT WHAT IT ADVERTISES. `ar-EG` writes its day period
      // as a single character, `ص` and `م`, and the placeholder shows the reader
      // both — while an earlier reader stripped every occurrence of those words
      // out of the text before looking for a marker, which removed the one the
      // user had just pressed along with the one on screen. Measured: neither
      // Arabic word did anything, in the one locale with a translated catalogue,
      // and only Latin `a`/`p` worked.
      const { container } = renderUi(
        <TimeInput name="opens" aria-label="Opens at" />,
        { locale: 'ar-EG' },
      );
      const field = screen.getByRole('textbox');
      await browser.click(field);
      await browser.keyboard('٠٩٣٠');
      await browser.keyboard('م');
      expect(carrier(container)).toHaveValue('21:30');

      await browser.keyboard('ص');
      expect(carrier(container)).toHaveValue('09:30');
    });

    it('takes the whole word without the second letter undoing the first', async () => {
      // THE REGRESSION THAT COST THE MOST. An earlier reader scored each
      // character on its own and let any letter shared by both words TOGGLE, so
      // `AM` read `A` as the morning and then `M` as "the other one" — the
      // field's own placeholder says `hh:mm AM/PM`, so it instructed the user
      // to type the very sequence that stores the opposite value. Measured over
      // 5408 word-typing cases across 2704 day-period configurations: 4 wrong
      // halves before that rule, 4215 after it.
      const { container } = renderUi(
        <TimeInput name="opens" aria-label="Opens at" />,
        { locale: 'en-US' },
      );
      const field = screen.getByRole('textbox');
      await browser.click(field);
      await browser.keyboard('0230AM');
      expect(field).toHaveValue('02:30 AM');
      expect(carrier(container)).toHaveValue('02:30');

      await browser.keyboard('PM');
      expect(field).toHaveValue('02:30 PM');
      expect(carrier(container)).toHaveValue('14:30');
    });

    it('waits for the letter that tells two words apart', async () => {
      // `午前` and `午後` share their first character, so a reader that decided
      // on it would be guessing. It decides on the SECOND, and the first names
      // nothing rather than naming the wrong thing.
      // SEEDED IN THE AFTERNOON on purpose: from a morning value, a reader that
      // guessed "morning" on the shared character would be indistinguishable
      // from one that waited, and the test would prove nothing.
      const { container } = renderUi(
        <TimeInput
          name="opens"
          aria-label="Opens at"
          hourCycle="h11"
          defaultValue="21:30"
        />,
        { locale: 'ja-JP' },
      );
      const field = screen.getByRole('textbox');
      await browser.click(field);
      await browser.keyboard('午');
      expect(carrier(container)).toHaveValue('21:30');
      await browser.keyboard('前');
      expect(carrier(container)).toHaveValue('09:30');
    });

    it('forgets the half of the day when the value is typed over', async () => {
      // Select-all-and-retype takes the drawn word out with everything else,
      // and the remembered half used to survive it: measured, `0230p`, select
      // all, `0330` stored `15:30` — an afternoon nobody had mentioned since
      // the field was wiped. Clearing the same field with Backspace forgot it
      // correctly, so one gesture disagreed with another that means the same.
      const { container } = renderUi(
        <TimeInput name="opens" aria-label="Opens at" />,
        { locale: 'en-US' },
      );
      const field = screen.getByRole('textbox') as HTMLInputElement;
      await browser.click(field);
      await browser.keyboard('0230p');
      expect(carrier(container)).toHaveValue('14:30');

      field.setSelectionRange(0, field.value.length);
      await browser.keyboard('0330');

      expect(field).toHaveValue('03:30 AM/PM');
      expect(carrier(container)).toHaveValue('');
    });

    it('accepts its own output pasted back in', async () => {
      // `DateInput` round-trips its own rendering; this did not. Copied out of
      // the field beside it — or out of a confirmation email — `02:30 PM`
      // pasted back came out as `02:30 AM/PM` with an empty carrier, because
      // the reader that stops the field re-reading its own drawn words on every
      // keystroke was also running on the one string that is entirely new.
      const { container } = renderUi(
        <TimeInput name="opens" aria-label="Opens at" />,
        { locale: 'en-US' },
      );
      const field = screen.getByRole('textbox') as HTMLInputElement;
      field.focus();
      // Through the PROTOTYPE setter, not a plain assignment: React's value
      // tracker records a direct write and then judges the event a no-op, so
      // `onChange` never fires and the test would be measuring nothing. The
      // same reason `setNativeValue` exists one directory up.
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )?.set?.call(field, '02:30 PM');
      field.dispatchEvent(
        new InputEvent('input', {
          bubbles: true,
          inputType: 'insertFromPaste',
          data: '02:30 PM',
        }),
      );

      await vi.waitFor(() => {
        expect(carrier(container)).toHaveValue('14:30');
      });
      expect(field).toHaveValue('02:30 PM');
    });

    it('carries seconds when it is asked to, and never when it is not', async () => {
      const minute = renderUi(
        <TimeInput name="a" aria-label="A" defaultValue="09:30:45" />,
        { locale: 'it' },
      );
      expect(carrier(minute.container)).toHaveValue('09:30');
      minute.unmount();

      const second = renderUi(
        <TimeInput name="b" aria-label="B" precision="second" />,
        { locale: 'it' },
      );
      const field = screen.getByRole('textbox');
      await browser.click(field);
      await browser.keyboard('093045');
      expect(field).toHaveValue('09:30:45');
      expect(carrier(second.container)).toHaveValue('09:30:45');
    });
  });

  describe('editing', () => {
    it('deletes the digit in front of a day period rather than doing nothing', async () => {
      // The rule a one-character separator hid: a twelve-hour field ends in a
      // WORD, so a Backspace lands five characters past the last digit. Under
      // the strict "touching" rule that removed nothing and re-emitted the same
      // text — a key that did nothing at all, for ever.
      renderUi(
        <TimeInput name="opens" aria-label="Opens at" defaultValue="14:30" />,
        { locale: 'en-US' },
      );
      const field = screen.getByRole('textbox');
      await browser.click(field);
      await browser.keyboard('{End}{Backspace}');
      expect(field).toHaveValue('02:3');
    });

    it('keeps the chosen half of the day across an edit', async () => {
      const { container } = renderUi(
        <TimeInput name="opens" aria-label="Opens at" defaultValue="14:30" />,
        { locale: 'en-US' },
      );
      const field = screen.getByRole('textbox');
      await browser.click(field);
      await browser.keyboard('{End}{Backspace}');
      await browser.keyboard('5');
      // Back to a whole time, still in the afternoon the field was showing —
      // the user does not have to say PM twice.
      expect(field).toHaveValue('02:35 PM');
      expect(carrier(container)).toHaveValue('14:35');
    });

    it('advances the caret when the frame is already full', async () => {
      // THE ANCHOR'S ONE BLIND SPOT, and it is not a twelve-hour one — the same
      // hole is in every segmented field this engine drives. Inserting into a
      // full value overflows the frame, the mask drops the surplus off the
      // right, and the right-anchored caret slipped one place left with it:
      // back to the start, every time, so each keystroke landed in front of the
      // last and the field walked through `10:09`, `07:10`, `04:07` to `05:04`.
      //
      // The CARET is what is asserted. A reflow into a full fixed frame is
      // lossy whatever it does; the defect was the loop, not the loss.
      renderUi(
        <TimeInput name="opens" aria-label="Opens at" defaultValue="09:00" />,
        { locale: 'it' },
      );
      const field = screen.getByRole('textbox') as HTMLInputElement;
      await browser.click(field);
      field.setSelectionRange(0, 0);
      await browser.keyboard('1');
      expect(field.selectionStart).toBeGreaterThan(0);
    });

    it('edits one part without moving the others', async () => {
      renderUi(
        <TimeInput name="opens" aria-label="Opens at" defaultValue="09:30" />,
        { locale: 'it' },
      );
      const field = screen.getByRole('textbox');
      await browser.click(field);
      await browser.keyboard('{End}{Backspace}{Backspace}');
      // The separator goes with the part it had nothing left to separate — an
      // emptied field is empty rather than a row of colons.
      expect(field).toHaveValue('09');
    });
  });

  describe('what arrives from outside', () => {
    it('takes a full instant and keeps only the clock reading', async () => {
      // `setValue(name, d.toISOString())` is the natural thing to write, and the
      // date family shipped two grammars that disagreed about it: the form
      // posted an instant the field had never shown.
      const { container } = renderUi(
        <TimeInput name="opens" aria-label="Opens at" />,
        { locale: 'it' },
      );
      const node = carrier(container);
      node.value = '2026-08-12T09:30:00.000Z';
      await vi.waitFor(() => {
        expect(screen.getByRole('textbox')).toHaveValue('09:30');
      });
      expect(node).toHaveValue('09:30');
    });

    it('tells the consumer when something else writes the field', async () => {
      const told = vi.fn();
      const { container } = renderUi(
        <TimeInput name="opens" aria-label="Opens at" onTimeChange={told} />,
        { locale: 'en-US' },
      );
      carrier(container).value = '21:05';
      await vi.waitFor(() => {
        expect(told).toHaveBeenCalledWith({ hour: 21, minute: 5 });
      });
      expect(screen.getByRole('textbox')).toHaveValue('09:05 PM');
    });

    it('forgets the half of the day when the field is cleared from outside', async () => {
      // The last half-of-the-day the user typed is remembered, so an edit that
      // trims the word off the text does not make them choose again. A CLEAR is
      // not an edit: `setValue(name, '')` means the value is gone, and the
      // remembered afternoon then attached itself to the next thing typed.
      // Measured: `0230p`, clear, `0330` — and the box read `03:30 PM` with
      // `15:30` on the carrier, an afternoon nobody had mentioned since.
      const { container } = renderUi(
        <TimeInput name="opens" aria-label="Opens at" />,
        { locale: 'en-US' },
      );
      const field = screen.getByRole('textbox');
      await browser.click(field);
      await browser.keyboard('0230p');
      expect(carrier(container)).toHaveValue('14:30');

      carrier(container).value = '';
      await vi.waitFor(() => {
        expect(field).toHaveValue('');
      });

      await browser.click(field);
      await browser.keyboard('0330');
      expect(field).toHaveValue('03:30 AM/PM');
      expect(carrier(container)).toHaveValue('');
    });

    it('goes back to its default on a form reset', async () => {
      const { container } = renderUi(
        <form>
          <TimeInput name="opens" aria-label="Opens at" defaultValue="09:00" />
          <button type="reset">Reset</button>
        </form>,
        { locale: 'it' },
      );
      const field = screen.getByRole('textbox') as HTMLInputElement;
      await browser.click(field);
      // Selected with the DOM rather than with `Ctrl`+`A`: select-all is `Cmd`
      // on macOS and `Ctrl` elsewhere, and a test that picked one would be
      // measuring the keyboard layout of whoever ran it.
      field.setSelectionRange(0, field.value.length);
      await browser.keyboard('1745');
      expect(field).toHaveValue('17:45');

      await browser.click(screen.getByRole('button', { name: 'Reset' }));
      await vi.waitFor(() => {
        expect(field).toHaveValue('09:00');
      });
      expect(carrier(container)).toHaveValue('09:00');
    });

    it('redraws in the new cycle when the locale moves', async () => {
      // Rendered through `UiProvider` directly rather than through `renderUi`:
      // that helper pins one adapters object per render call, deliberately, so
      // its `rerender` cannot move the locale — and a live language switch is
      // what ADR-0027 makes the supported way to re-locale a subtree.
      const { rerender } = render(
        <UiProvider adapters={{ i18n: { locale: 'it' } }}>
          <TimeInput name="opens" aria-label="Opens at" defaultValue="14:30" />
        </UiProvider>,
      );
      expect(screen.getByRole('textbox')).toHaveValue('14:30');

      rerender(
        <UiProvider adapters={{ i18n: { locale: 'en-US' } }}>
          <TimeInput name="opens" aria-label="Opens at" defaultValue="14:30" />
        </UiProvider>,
      );
      // The same instant, redrawn in the cycle the new locale reads — and NOT
      // left saying `14:30` under an `hh:mm AM/PM` hint, which would mean one
      // time to the reader and another to the carrier.
      await vi.waitFor(() => {
        expect(screen.getByRole('textbox')).toHaveValue('02:30 PM');
      });
    });
  });

  describe('what it says about itself', () => {
    it('describes the format it wants, in the locale frame', () => {
      renderUi(<TimeInput name="opens" aria-label="Opens at" />, {
        locale: 'en-US',
      });
      const field = screen.getByRole('textbox');
      expect(field).toHaveAttribute('placeholder', 'hh:mm AM/PM');
      expect(field).toHaveAccessibleDescription('hh:mm AM/PM');
    });

    it('says nothing about a format nobody can type into', () => {
      renderUi(<TimeInput name="opens" aria-label="Opens at" readOnly />, {
        locale: 'en-US',
      });
      const field = screen.getByRole('textbox');
      expect(field).not.toHaveAttribute('placeholder');
      expect(field).toHaveAccessibleDescription('');
    });

    it('raises a text keyboard when there is a day period to type', () => {
      // A numeric pad has no `p` on it, so a twelve-hour field with one would be
      // impossible to complete on the devices most people use it from.
      renderUi(<TimeInput name="a" aria-label="A" />, { locale: 'en-US' });
      expect(screen.getByRole('textbox')).toHaveAttribute('inputmode', 'text');
      screen.getByRole('textbox').remove();

      renderUi(<TimeInput name="b" aria-label="B" />, { locale: 'it' });
      expect(screen.getByRole('textbox')).toHaveAttribute(
        'inputmode',
        'numeric',
      );
    });

    it('drops an hour cycle Intl does not know, rather than throwing', () => {
      // `new Intl.DateTimeFormat(locale, { hourCycle })` raises a `RangeError`
      // for anything outside the four, and that call is in render — so a
      // config-driven value took the whole subtree down to the nearest error
      // boundary, where every other bad input this component takes degrades and
      // says so.
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      renderUi(
        <TimeInput
          name="opens"
          aria-label="Opens at"
          defaultValue="14:30"
          // @ts-expect-error — refused by the type; this is the caller the type
          // does not see, which is where a `RangeError` would come from.
          hourCycle="H12"
        />,
        { locale: 'it' },
      );
      expect(screen.getByRole('textbox')).toHaveValue('14:30');
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('is not one `Intl` knows'),
      );
      warn.mockRestore();
    });

    it('warns rather than starting empty in silence', () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      renderUi(
        <TimeInput
          name="opens"
          aria-label="Opens at"
          defaultValue="half nine"
        />,
        { locale: 'it' },
      );
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('is not an ISO time'),
      );
      warn.mockRestore();
    });

    it('has no a11y violations, named by a Field', async () => {
      const { container } = renderUi(
        <Field label="Opens at" hint="When the doors open">
          <TimeInput name="opens" />
        </Field>,
        { locale: 'en-US' },
      );
      await expectNoA11yViolations(container);
    });
  });
});

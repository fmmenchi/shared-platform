import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { DatePicker } from './date-picker.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

/** The carrier: hidden, so it is reachable only as a raw node. */
function carrier(container: HTMLElement): HTMLInputElement {
  const node = container.querySelector('[data-carrier]');
  if (node === null) throw new Error('no carrier in the rendered output');
  return node as HTMLInputElement;
}

const open = () =>
  browser.click(screen.getByRole('button', { name: 'Scegli dal calendario' }));

describe('DatePicker', () => {
  describe('the five steps it exists to get right', () => {
    it('1. writes the chosen day into the field, and tells a form binding', async () => {
      const onChange = vi.fn();
      const { container } = renderUi(
        <form>
          <DatePicker
            name="departure"
            aria-label="Partenza"
            defaultValue="2026-08-01"
            onChange={(event) => onChange(event.currentTarget.value)}
          />
        </form>,
        { locale: 'it' },
      );

      await open();
      await browser.click(
        container.querySelector('[data-day="2026-08-12"]') as HTMLElement,
      );

      // The field SHOWS the locale's order and POSTS the ISO — the division of
      // labour the whole family exists for.
      expect(screen.getByRole('textbox', { name: 'Partenza' })).toHaveValue(
        '12/08/2026',
      );
      const form = container.querySelector('form') as HTMLFormElement;
      expect(new FormData(form).getAll('departure')).toEqual(['2026-08-12']);
      // A plain `.value =` would update the DOM and tell nobody: React's value
      // tracker absorbs it and no change event ever fires.
      expect(onChange).toHaveBeenCalledWith('2026-08-12');
    });

    it('2. carries a TYPED date back to the grid', async () => {
      const { container } = renderUi(
        <DatePicker
          name="departure"
          aria-label="Partenza"
          defaultValue="2026-08-01"
        />,
        { locale: 'it' },
      );

      await browser.fill(
        screen.getByRole('textbox', { name: 'Partenza' }),
        '20082026',
      );
      await open();

      expect(
        container.querySelector('[data-day="2026-08-20"]'),
      ).toHaveAttribute('aria-selected', 'true');
    });

    it('3. moves the month with it, so the day is one the grid draws', async () => {
      const { container } = renderUi(
        <DatePicker
          name="departure"
          aria-label="Partenza"
          defaultValue="2026-08-01"
        />,
        { locale: 'it' },
      );

      // ANOTHER month entirely. Carrying the selection back is not enough on its
      // own — an August grid does not draw a December 2027 day, so the popover
      // would open with nothing selected in it.
      await browser.fill(
        screen.getByRole('textbox', { name: 'Partenza' }),
        '20122027',
      );
      await open();

      const day = container.querySelector('[data-day="2027-12-20"]');
      expect(day).not.toBeNull();
      expect(day).toHaveAttribute('aria-selected', 'true');
    });

    it('3b. and leaves the month where the user browsed to', async () => {
      const { container } = renderUi(
        <DatePicker
          name="departure"
          aria-label="Partenza"
          defaultValue="2026-08-20"
        />,
        { locale: 'it' },
      );

      await open();
      await browser.click(
        screen.getByRole('button', { name: 'Mese successivo' }),
      );

      // Browsing away from the selected month is something the user did on
      // purpose. Only a CHANGE of the value may undo it.
      expect(container.querySelector('[data-day="2026-09-15"]')).not.toBeNull();
      expect(container.querySelector('[data-day="2026-08-20"]')).toBeNull();
    });

    it('4. offers ONE control for opening it, not a button inside a button', async () => {
      renderUi(<DatePicker name="departure" aria-label="Partenza" />, {
        locale: 'it',
      });

      // `PopoverTrigger` IS a `Button`; one nested inside it would be two tab
      // stops for one affordance, and `nested-interactive` to axe.
      const triggers = screen.getAllByRole('button', {
        name: 'Scegli dal calendario',
      });
      expect(triggers).toHaveLength(1);
      expect(triggers[0]?.querySelector('button')).toBeNull();
    });
  });

  describe('it is still a field', () => {
    it('can be typed into after a day was chosen from the grid', async () => {
      const { container } = renderUi(
        <form>
          <DatePicker
            name="departure"
            aria-label="Partenza"
            defaultValue="2026-08-01"
          />
        </form>,
        { locale: 'it' },
      );

      await open();
      await browser.click(
        container.querySelector('[data-day="2026-08-12"]') as HTMLElement,
      );
      const field = screen.getByRole('textbox', { name: 'Partenza' });
      await browser.fill(field, '01012000');

      expect(field).toHaveValue('01/01/2000');
      const form = container.querySelector('form') as HTMLFormElement;
      expect(new FormData(form).getAll('departure')).toEqual(['2000-01-01']);
    });

    it('posts exactly one value, under one name', async () => {
      const { container } = renderUi(
        <form>
          <DatePicker
            name="departure"
            aria-label="Partenza"
            defaultValue="2026-08-12"
          />
        </form>,
        { locale: 'it' },
      );

      const form = container.querySelector('form') as HTMLFormElement;
      // The visible field has no name, so the group contributes one entry —
      // the carrier's. Two would mean the mask's text was being submitted too.
      expect([...new FormData(form).keys()]).toEqual(['departure']);
    });

    it('opens on the seeded day rather than on today', async () => {
      const { container } = renderUi(
        <DatePicker
          name="departure"
          aria-label="Partenza"
          defaultValue="2026-08-12"
        />,
        { locale: 'it' },
      );

      await open();

      expect(
        container.querySelector('[data-day="2026-08-12"]'),
      ).toHaveAttribute('aria-selected', 'true');
    });

    it('reports the parsed day, from the grid AND from the keyboard', async () => {
      const onDateChange = vi.fn();
      const { container } = renderUi(
        <DatePicker
          name="departure"
          aria-label="Partenza"
          defaultValue="2026-08-01"
          onDateChange={onDateChange}
        />,
        { locale: 'it' },
      );

      await browser.fill(
        screen.getByRole('textbox', { name: 'Partenza' }),
        '20082026',
      );
      expect(onDateChange).toHaveBeenLastCalledWith({
        year: 2026,
        month: 8,
        day: 20,
      });

      await open();
      await browser.click(
        container.querySelector('[data-day="2026-08-12"]') as HTMLElement,
      );
      // `DateInput` raises this from the VISIBLE field's change handler, which a
      // write onto the carrier never passes through — so the grid has to report
      // it itself or a consumer hears nothing when a day is clicked.
      expect(onDateChange).toHaveBeenLastCalledWith({
        year: 2026,
        month: 8,
        day: 12,
      });
    });
  });

  describe('read-only, where the field itself is the trigger', () => {
    const field = () => screen.getByRole('textbox', { name: 'Partenza' });
    // THE CELLS ARE ALWAYS IN THE DOM — the calendar lives inside a closed
    // `<dialog popover>`, not behind a mount. Asking for a `[data-day]` says
    // nothing about whether the thing is on screen; `:popover-open` does.
    const isOpen = (container: HTMLElement) =>
      container.querySelector('dialog')?.matches(':popover-open') === true;

    it('opens the calendar when the field is clicked', async () => {
      const { container } = renderUi(
        <DatePicker
          name="departure"
          aria-label="Partenza"
          defaultValue="2026-08-12"
          readOnly
        />,
        { locale: 'it' },
      );
      expect(isOpen(container)).toBe(false);

      await browser.click(field());

      expect(isOpen(container)).toBe(true);
      // Nothing to protect: a field nobody can type in has no caret, so the
      // whole field is the target. Typeable, the same click would take the
      // caret away mid-edit, which is why it does nothing there.
      expect(
        container.querySelector('[data-day="2026-08-12"]'),
      ).toHaveAttribute('aria-selected', 'true');
    });

    it('does NOT open when the field can be typed into', async () => {
      const { container } = renderUi(
        <DatePicker
          name="departure"
          aria-label="Partenza"
          defaultValue="2026-08-12"
        />,
        { locale: 'it' },
      );

      await browser.click(field());

      expect(isOpen(container)).toBe(false);
    });

    it('closes on a second click rather than reopening under the user', async () => {
      const { container } = renderUi(
        <DatePicker
          name="departure"
          aria-label="Partenza"
          defaultValue="2026-08-12"
          readOnly
        />,
        { locale: 'it' },
      );

      await browser.click(field());
      expect(isOpen(container)).toBe(true);
      // The platform light-dismisses on the POINTERDOWN of this second click,
      // and the click that follows would then re-open what was being closed —
      // a calendar the field could open and never shut.
      await browser.click(field());

      expect(isOpen(container)).toBe(false);
    });

    it('stops telling a reader how to type into it', () => {
      const { container } = renderUi(
        <DatePicker
          name="departure"
          aria-label="Partenza"
          defaultValue="2026-08-12"
          readOnly
        />,
        { locale: 'it' },
      );

      // `gg/mm/aaaa` is an instruction, and this control refuses it. It goes
      // from the placeholder and from the description together.
      expect(field()).not.toHaveAttribute('placeholder');
      const described = field().getAttribute('aria-describedby') ?? '';
      const text = described
        .split(' ')
        .map((id) => document.getElementById(id)?.textContent)
        .join('');
      expect(text).not.toContain('gg');
      expect(container.textContent).not.toContain('gg/mm/aaaa');
    });

    it('still posts its value, and still keeps the trigger for the keyboard', async () => {
      const { container } = renderUi(
        <form>
          <DatePicker
            name="departure"
            aria-label="Partenza"
            defaultValue="2026-08-12"
            readOnly
          />
        </form>,
        { locale: 'it' },
      );

      // A read-only control is submitted — unlike a disabled one — and the
      // button stays, because the field's click is a pointer convenience and
      // the trigger is what a keyboard and a screen reader reach.
      const form = container.querySelector('form') as HTMLFormElement;
      expect(new FormData(form).getAll('departure')).toEqual(['2026-08-12']);
      expect(
        screen.getByRole('button', { name: 'Scegli dal calendario' }),
      ).toBeInTheDocument();
    });

    it('refuses typing, as the platform already does', async () => {
      renderUi(
        <DatePicker
          name="departure"
          aria-label="Partenza"
          defaultValue="2026-08-12"
          readOnly
        />,
        { locale: 'it' },
      );

      await browser.fill(field(), '01012000').catch(() => undefined);

      expect(field()).toHaveValue('12/08/2026');
    });

    it('has no accessibility violations', async () => {
      const { container } = renderUi(
        <DatePicker
          name="departure"
          aria-label="Partenza"
          defaultValue="2026-08-12"
          readOnly
        />,
        { locale: 'it' },
      );
      await expectNoA11yViolations(container);
    });
  });

  describe('what it passes through', () => {
    it('refuses days the consumer refuses, in the grid', async () => {
      const { container } = renderUi(
        <DatePicker
          name="departure"
          aria-label="Partenza"
          defaultValue="2026-08-01"
          isDateDisabled={(date) => date.day === 12}
        />,
        { locale: 'it' },
      );

      await open();

      // `aria-disabled`, not `disabled`: the APG's "focusable but not
      // activatable", so the arrows still announce the day is there.
      expect(
        container.querySelector('[data-day="2026-08-12"]'),
      ).toHaveAttribute('aria-disabled', 'true');
    });

    it('draws the trigger as a square, inside the field rather than across it', () => {
      const { container } = renderUi(
        <DatePicker name="departure" aria-label="Partenza" />,
        { locale: 'it' },
      );
      const group = container.querySelector('div') as HTMLElement;
      const trigger = screen.getByRole('button', {
        name: 'Scegli dal calendario',
      });
      const box = trigger.getBoundingClientRect();

      // SQUARE, which needs the glyph to travel as `icon` rather than as a
      // child: `Button` derives `isIconOnly` from that, and only then drops its
      // horizontal padding. Passed as a child it stayed a `px-4` rectangle, and
      // its hover fill was a wide pale block inside the field's rounded border.
      expect(Math.round(box.width)).toBe(Math.round(box.height));
      // …and shorter than the field, so the row centres it and the group's own
      // border stays clear of whatever the hover paints.
      const groupBox = group.getBoundingClientRect();
      expect(box.height).toBeLessThan(groupBox.height);
      expect(box.right).toBeLessThan(groupBox.right);
    });

    it('takes the trigger label the consumer gives it', () => {
      renderUi(
        <DatePicker
          name="departure"
          aria-label="Partenza"
          triggerLabel="Apri il calendario"
        />,
        { locale: 'it' },
      );

      expect(
        screen.getByRole('button', { name: 'Apri il calendario' }),
      ).toBeInTheDocument();
    });

    it('names the trigger in the declared locale by default', () => {
      renderUi(<DatePicker name="departure" aria-label="Departure" />, {
        locale: 'en',
      });

      expect(
        screen.getByRole('button', { name: 'Choose from a calendar' }),
      ).toBeInTheDocument();
    });

    it('disables the trigger with the field, so a read-only date cannot be changed', () => {
      renderUi(<DatePicker name="departure" aria-label="Partenza" disabled />, {
        locale: 'it',
      });

      expect(
        screen.getByRole('button', { name: 'Scegli dal calendario' }),
      ).toBeDisabled();
    });

    it('still hands the carrier to a consumer who asks for it', () => {
      let node: HTMLInputElement | null = null;
      const { container } = renderUi(
        <DatePicker
          name="departure"
          aria-label="Partenza"
          carrierRef={(element) => {
            node = element;
          }}
        />,
        { locale: 'it' },
      );

      // Merged rather than replaced: the picker keeps its own reference, and a
      // form binding — which is what actually asks for this — still gets one.
      expect(node).toBe(carrier(container));
    });
  });

  it('has no accessibility violations, closed and open', async () => {
    const { container } = renderUi(
      <DatePicker
        name="departure"
        aria-label="Partenza"
        defaultValue="2026-08-12"
      />,
      { locale: 'it' },
    );

    await expectNoA11yViolations(container);
    await open();
    await expectNoA11yViolations(container);
  });
});

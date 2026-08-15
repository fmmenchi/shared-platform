import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { DateRangePicker } from './date-range-picker.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

const open = () =>
  browser.click(
    screen.getByRole('button', { name: 'Scegli le date dal calendario' }),
  );

const day = (container: HTMLElement, iso: string) =>
  container.querySelector(`[data-day="${iso}"]`) as HTMLElement;

const carriers = (container: HTMLElement) =>
  [...container.querySelectorAll('[data-carrier]')] as HTMLInputElement[];

const picker = (extra: Record<string, unknown> = {}) => (
  <form>
    <DateRangePicker
      startName="checkIn"
      endName="checkOut"
      startLabel="Arrivo"
      endLabel="Partenza"
      defaultMonth={{ year: 2026, month: 8, day: 1 }}
      {...extra}
    />
  </form>
);

describe('DateRangePicker', () => {
  describe('two values, two names, two entries', () => {
    it('posts each end under its own name', async () => {
      const { container } = renderUi(picker(), { locale: 'it' });

      await open();
      await browser.click(day(container, '2026-08-12'));
      await browser.click(day(container, '2026-08-15'));

      // ONE NAME CARRYING BOTH would break the promise the family is built on,
      // and a `FormData` with two entries under one key is a shape every
      // backend reads differently.
      const form = container.querySelector('form') as HTMLFormElement;
      const data = new FormData(form);
      expect([...data.keys()]).toEqual(['checkIn', 'checkOut']);
      expect(data.get('checkIn')).toBe('2026-08-12');
      expect(data.get('checkOut')).toBe('2026-08-15');
    });

    it('shows each end in the locale order while posting ISO', async () => {
      const { container } = renderUi(picker(), { locale: 'it' });

      await open();
      await browser.click(day(container, '2026-08-12'));
      await browser.click(day(container, '2026-08-15'));

      expect(screen.getByRole('textbox', { name: 'Arrivo' })).toHaveValue(
        '12/08/2026',
      );
      expect(screen.getByRole('textbox', { name: 'Partenza' })).toHaveValue(
        '15/08/2026',
      );
    });

    it('seeds both ends, and opens on the start', async () => {
      // NO `defaultMonth`, and a seed in a month that is NOT this one. With a
      // `defaultMonth` the seed proves nothing about the start; with a seed in
      // the current month it proves nothing either, because the fallback to
      // today lands on the same grid — measured, the rule could be deleted and
      // every test stayed green.
      const { container } = renderUi(
        <form>
          <DateRangePicker
            startName="checkIn"
            endName="checkOut"
            startLabel="Arrivo"
            endLabel="Partenza"
            defaultStart="2027-06-12"
            defaultEnd="2027-06-15"
          />
        </form>,
        { locale: 'it' },
      );
      expect(screen.getByRole('textbox', { name: 'Arrivo' })).toHaveValue(
        '12/06/2027',
      );

      await open();
      expect(day(container, '2027-06-12')).toHaveAttribute(
        'aria-selected',
        'true',
      );
      expect(day(container, '2027-06-13')).toHaveAttribute('data-in-range');
    });
  });

  describe('the popover waits for the second click', () => {
    const isOpen = (container: HTMLElement) =>
      container.querySelector('dialog')?.matches(':popover-open') === true;

    it('stays open after the first, and closes after the second', async () => {
      const { container } = renderUi(picker(), { locale: 'it' });

      await open();
      await browser.click(day(container, '2026-08-12'));
      // Closing here would ask the user to reopen the calendar to finish the
      // thing they had just started.
      expect(isOpen(container)).toBe(true);

      await browser.click(day(container, '2026-08-15'));
      expect(isOpen(container)).toBe(false);
    });

    it('writes the start on the first click, before there is an end', async () => {
      const { container } = renderUi(picker(), { locale: 'it' });

      await open();
      await browser.click(day(container, '2026-08-12'));

      expect(screen.getByRole('textbox', { name: 'Arrivo' })).toHaveValue(
        '12/08/2026',
      );
      expect(screen.getByRole('textbox', { name: 'Partenza' })).toHaveValue('');
    });
  });

  describe('typing is not clicking', () => {
    it('takes each end from its own field', async () => {
      const { container } = renderUi(picker(), { locale: 'it' });

      await browser.fill(
        screen.getByRole('textbox', { name: 'Arrivo' }),
        '12082026',
      );
      await browser.fill(
        screen.getByRole('textbox', { name: 'Partenza' }),
        '15082026',
      );
      await open();

      expect(day(container, '2026-08-12')).toHaveAttribute(
        'aria-selected',
        'true',
      );
      expect(day(container, '2026-08-14')).toHaveAttribute('data-in-range');
    });

    it('drops the end when a typed start would come after it', async () => {
      const { container } = renderUi(
        picker({ defaultStart: '2026-08-12', defaultEnd: '2026-08-15' }),
        { locale: 'it' },
      );

      // A click walks `takeDay`, which knows what the previous click meant. A
      // keystroke names ONE end and leaves the other as it was, so it can make
      // a pair a click never could. What was typed is what was meant; the other
      // end is the one that no longer makes sense.
      await browser.fill(
        screen.getByRole('textbox', { name: 'Arrivo' }),
        '20082026',
      );

      // THE FORM, not the grid. An inverted range renders identically — the
      // span is empty either way — so a grid-only assertion passed with the
      // rule deleted entirely, measured. What must not survive is a `FormData`
      // holding the end the consumer was told had gone.
      const form = container.querySelector('form') as HTMLFormElement;
      const data = new FormData(form);
      expect(data.get('checkIn')).toBe('2026-08-20');
      expect(data.get('checkOut')).toBe('');
      expect(screen.getByRole('textbox', { name: 'Partenza' })).toHaveValue('');
    });

    it('drops the START when a typed end would come before it', async () => {
      const { container } = renderUi(
        picker({ defaultStart: '2026-08-12', defaultEnd: '2026-08-15' }),
        { locale: 'it' },
      );

      // The other half of the same rule, and the half that was dead code: the
      // branch returned the untouched pair, which is the same as having no rule
      // — measured posting checkIn 2026-08-12 with checkOut 2026-08-05.
      await browser.fill(
        screen.getByRole('textbox', { name: 'Partenza' }),
        '05082026',
      );

      const form = container.querySelector('form') as HTMLFormElement;
      const data = new FormData(form);
      expect(data.get('checkOut')).toBe('2026-08-05');
      expect(data.get('checkIn')).toBe('');
      expect(screen.getByRole('textbox', { name: 'Arrivo' })).toHaveValue('');
    });

    it('reports the range as it stands, half made included — ONCE', async () => {
      const onRangeChange = vi.fn();
      const { container } = renderUi(picker({ onRangeChange }), {
        locale: 'it',
      });

      await open();
      await browser.click(day(container, '2026-08-12'));

      // The count is the assertion. `writeDateInput` dispatches a real `input`
      // on each carrier, each field reports it back, and `typed()` used to run
      // on both with the range from BEFORE the click — measured, one click
      // emitted three calls and the last was rebuilt from a stale start.
      expect(onRangeChange).toHaveBeenCalledTimes(1);
      expect(onRangeChange).toHaveBeenLastCalledWith({
        start: { year: 2026, month: 8, day: 12 },
        end: null,
      });
    });

    it('does not rewind the start when a third click starts a new range', async () => {
      const { container } = renderUi(picker(), { locale: 'it' });

      await open();
      await browser.click(day(container, '2026-08-12'));
      await browser.click(day(container, '2026-08-15'));
      await open();
      await browser.click(day(container, '2026-08-20'));
      await browser.click(day(container, '2026-08-25'));

      // Measured before the round-trip was stopped: the start field went back
      // to 12/08 on the last click, and the form posted a range the user had
      // replaced two gestures earlier.
      const form = container.querySelector('form') as HTMLFormElement;
      const data = new FormData(form);
      expect(data.get('checkIn')).toBe('2026-08-20');
      expect(data.get('checkOut')).toBe('2026-08-25');
      expect(screen.getByRole('textbox', { name: 'Arrivo' })).toHaveValue(
        '20/08/2026',
      );
    });
  });

  describe('what a reader is told', () => {
    it('announces the finished range outside the surface that is closing', async () => {
      const { container } = renderUi(picker(), { locale: 'it' });

      await open();
      await browser.click(day(container, '2026-08-12'));
      await browser.click(day(container, '2026-08-15'));

      // OUTSIDE THE DIALOG, which is the whole claim. The calendar has a region
      // of its own with a byte-identical sentence in it, so reading every
      // `role="status"` in the tree passed with this component's announcement
      // replaced by a mutant — measured.
      const outside = [...container.querySelectorAll('[role="status"]')]
        .filter((node) => node.closest('dialog') === null)
        .map((node) => node.textContent ?? '');
      // The other regions outside the dialog belong to the test wrapper and are
      // empty, so a mutant emptying this component's own sentence leaves
      // nothing here to find.
      expect(
        outside.some(
          (text) =>
            text.includes('12 agosto 2026') && text.includes('15 agosto 2026'),
        ),
      ).toBe(true);
    });

    it('names each field, and the trigger once for both', () => {
      renderUi(picker(), { locale: 'it' });

      expect(
        screen.getByRole('textbox', { name: 'Arrivo' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('textbox', { name: 'Partenza' }),
      ).toBeInTheDocument();
      expect(
        screen.getAllByRole('button', {
          name: 'Scegli le date dal calendario',
        }),
      ).toHaveLength(1);
    });

    it('has no accessibility violations, closed and open', async () => {
      const { container } = renderUi(
        picker({ defaultStart: '2026-08-12', defaultEnd: '2026-08-15' }),
        { locale: 'it' },
      );
      await expectNoA11yViolations(container);
      await open();
      await expectNoA11yViolations(container);
    });
  });

  describe('disabled and pick-only', () => {
    it('freezes the trigger with the fields', () => {
      renderUi(picker({ disabled: true }), { locale: 'it' });
      expect(
        screen.getByRole('button', { name: 'Scegli le date dal calendario' }),
      ).toBeDisabled();
    });

    it('opens from either field when neither can be typed into', async () => {
      const { container } = renderUi(picker({ pickOnly: true }), {
        locale: 'it',
      });
      const isOpen = () =>
        container.querySelector('dialog')?.matches(':popover-open') === true;

      await browser.click(screen.getByRole('textbox', { name: 'Partenza' }));

      expect(isOpen()).toBe(true);
      expect(screen.getByRole('textbox', { name: 'Partenza' })).toHaveAttribute(
        'aria-haspopup',
        'dialog',
      );
    });

    it('keeps two carriers whatever the mode', () => {
      const { container } = renderUi(picker({ pickOnly: true }), {
        locale: 'it',
      });
      expect(carriers(container)).toHaveLength(2);
    });
  });
});

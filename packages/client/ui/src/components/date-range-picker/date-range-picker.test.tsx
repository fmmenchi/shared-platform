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
      const { container } = renderUi(
        picker({ defaultStart: '2026-08-12', defaultEnd: '2026-08-15' }),
        { locale: 'it' },
      );
      expect(screen.getByRole('textbox', { name: 'Arrivo' })).toHaveValue(
        '12/08/2026',
      );

      await open();
      expect(day(container, '2026-08-12')).toHaveAttribute(
        'aria-selected',
        'true',
      );
      expect(day(container, '2026-08-13')).toHaveAttribute('data-in-range');
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

      await open();
      expect(day(container, '2026-08-20')).toHaveAttribute(
        'aria-selected',
        'true',
      );
      expect(container.querySelectorAll('[data-in-range]')).toHaveLength(0);
    });

    it('reports the range as it stands, half made included', async () => {
      const onRangeChange = vi.fn();
      const { container } = renderUi(picker({ onRangeChange }), {
        locale: 'it',
      });

      await open();
      await browser.click(day(container, '2026-08-12'));

      expect(onRangeChange).toHaveBeenLastCalledWith({
        start: { year: 2026, month: 8, day: 12 },
        end: null,
      });
    });
  });

  describe('what a reader is told', () => {
    it('announces the finished range outside the surface that is closing', async () => {
      const { container } = renderUi(picker(), { locale: 'it' });

      await open();
      await browser.click(day(container, '2026-08-12'));
      await browser.click(day(container, '2026-08-15'));

      // The calendar announces as it goes, but that region is INSIDE the
      // popover, which closes on this very click — a sentence set on a surface
      // going away is one a reader may never be given.
      const regions = [...container.querySelectorAll('[role="status"]')];
      const spoken = regions.map((n) => n.textContent ?? '').join(' | ');
      expect(spoken).toContain('12 agosto 2026');
      expect(spoken).toContain('15 agosto 2026');
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

import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { Calendar } from './calendar.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';
import type { CivilDate } from '../../date/civil-date.types.js';

const AUGUST: CivilDate = { year: 2026, month: 8, day: 12 };

/** The cell for a day, found the way the component's own focus effect finds it. */
function cell(container: HTMLElement, iso: string): HTMLButtonElement {
  const node = container.querySelector(`[data-day="${iso}"]`);
  if (node === null) throw new Error(`no cell for ${iso}`);
  return node as HTMLButtonElement;
}

describe('Calendar', () => {
  describe('the grid', () => {
    it('shows the month it was opened on, named in the locale', () => {
      renderUi(<Calendar defaultMonth={AUGUST} />, { locale: 'it' });
      expect(screen.getByRole('grid')).toHaveAccessibleName('agosto 2026');
    });

    it('always draws six weeks, so the grid does not resize between months', () => {
      const { container } = renderUi(<Calendar defaultMonth={AUGUST} />, {
        locale: 'it',
      });
      expect(container.querySelectorAll('tbody tr')).toHaveLength(6);
      expect(container.querySelectorAll('[data-day]')).toHaveLength(42);
    });

    it('starts the week where the locale starts it', () => {
      const { container } = renderUi(<Calendar defaultMonth={AUGUST} />, {
        locale: 'en-US',
      });
      const headers = [...container.querySelectorAll('th')].map((th) =>
        th.getAttribute('abbr'),
      );
      // en-US starts on Sunday; `it` starts on Monday. Both come from the
      // locale, neither from a list in this repo.
      expect(headers[0]).toBe('Sunday');

      const italian = renderUi(<Calendar defaultMonth={AUGUST} />, {
        locale: 'it',
      });
      const first = italian.container.querySelector('th');
      expect(first?.getAttribute('abbr')).toBe('lunedì');
    });

    it('takes an explicit firstDayOfWeek over the locale', () => {
      const { container } = renderUi(
        <Calendar defaultMonth={AUGUST} firstDayOfWeek={6} />,
        { locale: 'it' },
      );
      expect(container.querySelector('th')?.getAttribute('abbr')).toBe(
        'sabato',
      );
    });
  });

  describe('the roving focus is a date, not a cell', () => {
    it('moves a day with the arrows', async () => {
      const { container } = renderUi(<Calendar defaultValue={AUGUST} />, {
        locale: 'it',
      });
      cell(container, '2026-08-12').focus();

      await browser.keyboard('{ArrowRight}');
      expect(cell(container, '2026-08-13')).toHaveFocus();

      await browser.keyboard('{ArrowDown}');
      expect(cell(container, '2026-08-20')).toHaveFocus();
    });

    it('crosses into a month that is not on screen yet', async () => {
      const { container } = renderUi(
        <Calendar defaultValue={{ year: 2026, month: 8, day: 31 }} />,
        { locale: 'it' },
      );
      cell(container, '2026-08-31').focus();

      // The cell for 1 September does not exist as a September cell until the
      // grid has re-rendered around it — which is the whole reason the focus is
      // a DATE and not an index into the row it started in.
      await browser.keyboard('{ArrowRight}');

      expect(screen.getByRole('grid')).toHaveAccessibleName('settembre 2026');
      expect(cell(container, '2026-09-01')).toHaveFocus();
    });

    it('moves a month with PageDown and a year with Shift', async () => {
      const { container } = renderUi(<Calendar defaultValue={AUGUST} />, {
        locale: 'it',
      });
      cell(container, '2026-08-12').focus();

      await browser.keyboard('{PageDown}');
      expect(cell(container, '2026-09-12')).toHaveFocus();

      await browser.keyboard('{Shift>}{PageUp}{/Shift}');
      expect(cell(container, '2025-09-12')).toHaveFocus();
    });

    it('clamps rather than rolling forward when the next month is shorter', async () => {
      const { container } = renderUi(
        <Calendar defaultValue={{ year: 2026, month: 1, day: 31 }} />,
        { locale: 'it' },
      );
      cell(container, '2026-01-31').focus();

      // 31 January plus a month is 28 February, not 3 March — otherwise holding
      // PageDown skips February altogether.
      await browser.keyboard('{PageDown}');
      expect(cell(container, '2026-02-28')).toHaveFocus();
    });

    it('goes to the ends of the week with Home and End', async () => {
      const { container } = renderUi(<Calendar defaultValue={AUGUST} />, {
        locale: 'it',
      });
      cell(container, '2026-08-12').focus();

      await browser.keyboard('{Home}');
      expect(cell(container, '2026-08-10')).toHaveFocus();

      await browser.keyboard('{End}');
      expect(cell(container, '2026-08-16')).toHaveFocus();
    });

    it('is one tab stop, not forty-two', () => {
      const { container } = renderUi(<Calendar defaultValue={AUGUST} />, {
        locale: 'it',
      });
      const tabbable = [...container.querySelectorAll('[data-day]')].filter(
        (day) => day.getAttribute('tabindex') === '0',
      );
      expect(tabbable).toHaveLength(1);
      expect(tabbable[0]).toBe(cell(container, '2026-08-12'));
    });
  });

  describe('per-date disabling, which is why it exists', () => {
    it('marks a refused day without taking it out of the grid', () => {
      const { container } = renderUi(
        <Calendar
          defaultMonth={AUGUST}
          isDateDisabled={(date) => date.day === 15}
        />,
        { locale: 'it' },
      );
      const refused = cell(container, '2026-08-15');
      // `aria-disabled`, never `disabled`: a disabled button leaves the
      // accessibility tree, so the arrows would walk over a day nobody is told
      // about.
      expect(refused).toHaveAttribute('aria-disabled', 'true');
      expect(refused).not.toBeDisabled();
    });

    it('does not select one when it is clicked', async () => {
      const onValueChange = vi.fn();
      const { container } = renderUi(
        <Calendar
          defaultMonth={AUGUST}
          isDateDisabled={(date) => date.day === 15}
          onValueChange={onValueChange}
        />,
        { locale: 'it' },
      );
      // Clicked through the DOM rather than through the driver: an
      // `aria-disabled` control fails the automation's own "enabled" check, so
      // the driver waits for it to become clickable and never clicks. The
      // handler is what is under test, and a real user's pointer reaches it.
      cell(container, '2026-08-15').click();
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('still lets the arrows reach it', async () => {
      const { container } = renderUi(
        <Calendar
          defaultValue={{ year: 2026, month: 8, day: 14 }}
          isDateDisabled={(date) => date.day === 15}
        />,
        { locale: 'it' },
      );
      cell(container, '2026-08-14').focus();
      await browser.keyboard('{ArrowRight}');
      expect(cell(container, '2026-08-15')).toHaveFocus();
    });
  });

  describe('choosing a day', () => {
    it('hands back a civil date, months 1-12', async () => {
      const onValueChange = vi.fn();
      const { container } = renderUi(
        <Calendar defaultMonth={AUGUST} onValueChange={onValueChange} />,
        { locale: 'it' },
      );
      await browser.click(cell(container, '2026-08-12'));
      expect(onValueChange).toHaveBeenCalledWith({
        year: 2026,
        month: 8,
        day: 12,
      });
    });

    it('marks the selected cell for the eye and for assistive tech', async () => {
      const { container } = renderUi(<Calendar defaultMonth={AUGUST} />, {
        locale: 'it',
      });
      await browser.click(cell(container, '2026-08-12'));
      expect(cell(container, '2026-08-12').closest('td')).toHaveAttribute(
        'aria-selected',
        'true',
      );
    });

    it('says which month is on screen, for a reader who cannot see it change', async () => {
      const { container } = renderUi(<Calendar defaultValue={AUGUST} />, {
        locale: 'it',
      });
      // Found by its words rather than by its role: the harness mounts a global
      // toast region, which is a `status` too. What matters is that this
      // sentence lives in a live region at all — announced, not drawn.
      const status = screen.getByText('Stai vedendo agosto 2026');
      expect(status).toHaveAttribute('role', 'status');

      cell(container, '2026-08-12').focus();
      await browser.keyboard('{PageDown}');
      expect(status).toHaveTextContent('Stai vedendo settembre 2026');
    });
  });

  it('has no accessibility violations', async () => {
    const { container } = renderUi(
      <Calendar defaultValue={AUGUST} isDateDisabled={(d) => d.day === 15} />,
      { locale: 'it' },
    );
    await expectNoA11yViolations(container);
  });
});

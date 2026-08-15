import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { Calendar } from './calendar.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';
import { useState } from 'react';
import type { CivilDate, CivilRange } from '../../date/civil-date.types.js';

const AUGUST: CivilDate = { year: 2026, month: 8, day: 12 };

/** The cell for a day, found the way the component's own focus effect finds it. */
function cell(container: HTMLElement, iso: string): HTMLButtonElement {
  const node = container.querySelector(`[data-day="${iso}"]`);
  if (node === null) throw new Error(`no cell for ${iso}`);
  return node as HTMLButtonElement;
}

/**
 * Focus a cell AND WAIT FOR IT TO LAND, before any key is sent.
 *
 * `element.focus()` is synchronous but the key that follows is not: it is
 * dispatched into the page and delivered to whatever holds the focus THEN.
 * Firing one straight after the other assumes a race is already won, and under
 * load it is not — measured, this file's arrow tests failed in a run shared
 * with two other suites and passed alone and in their own, every time.
 *
 * Waiting instead of assuming also moves the failure to where the cause is: a
 * focus that never landed now fails saying so, rather than an arrow key
 * appearing to move the wrong day.
 */
async function focusCell(container: HTMLElement, iso: string) {
  const node = cell(container, iso);
  node.focus();
  await waitFor(() => expect(node).toHaveFocus());
  return node;
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
      await focusCell(container, '2026-08-12');

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
      await focusCell(container, '2026-08-31');

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
      await focusCell(container, '2026-08-12');

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
      await focusCell(container, '2026-01-31');

      // 31 January plus a month is 28 February, not 3 March — otherwise holding
      // PageDown skips February altogether.
      await browser.keyboard('{PageDown}');
      expect(cell(container, '2026-02-28')).toHaveFocus();
    });

    it('goes to the ends of the week with Home and End', async () => {
      const { container } = renderUi(<Calendar defaultValue={AUGUST} />, {
        locale: 'it',
      });
      await focusCell(container, '2026-08-12');

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

  describe('the tab stop, which is the thing that goes missing', () => {
    it('survives the month buttons', async () => {
      const { container } = renderUi(<Calendar defaultValue={AUGUST} />, {
        locale: 'it',
      });
      // Measured before this was fixed: 80.7% of (focused day, direction) pairs
      // left the grid with ZERO tabbable cells, because `focused` stayed in the
      // old month while the grid moved on. Tab then walked straight past the
      // whole calendar and there was no way back in without a mouse.
      await browser.click(
        screen.getByRole('button', { name: 'Mese successivo' }),
      );

      const stops = [...container.querySelectorAll('[data-day]')].filter(
        (day) => day.getAttribute('tabindex') === '0',
      );
      expect(stops).toHaveLength(1);
    });

    it('survives a month the consumer refuses to change', async () => {
      // A controlled `month` whose owner ignores `onMonthChange` — the grid
      // cannot follow the keys, and the tab stop must still exist.
      const { container } = renderUi(
        <Calendar month={{ year: 2026, month: 8, day: 1 }} />,
        { locale: 'it' },
      );
      await focusCell(container, '2026-08-12');
      await browser.keyboard('{PageDown}');

      const stops = [...container.querySelectorAll('[data-day]')].filter(
        (day) => day.getAttribute('tabindex') === '0',
      );
      expect(stops).toHaveLength(1);
    });

    it('exists when the opening month and the selected day disagree', () => {
      const { container } = renderUi(
        <Calendar
          defaultValue={{ year: 2026, month: 1, day: 15 }}
          defaultMonth={{ year: 2026, month: 8, day: 1 }}
        />,
        { locale: 'it' },
      );
      // Both props are documented as independent, so this combination is
      // supported — and on the first paint it left no tab stop at all.
      const stops = [...container.querySelectorAll('[data-day]')].filter(
        (day) => day.getAttribute('tabindex') === '0',
      );
      expect(stops).toHaveLength(1);
    });

    it('follows the ring rather than staying on the opening day', async () => {
      const { container } = renderUi(<Calendar defaultValue={AUGUST} />, {
        locale: 'it',
      });
      await focusCell(container, '2026-08-12');
      await browser.keyboard('{ArrowDown}{ArrowDown}');

      const stops = [...container.querySelectorAll('[data-day]')].filter(
        (day) => day.getAttribute('tabindex') === '0',
      );
      expect(stops).toHaveLength(1);
      expect(stops[0]).toBe(cell(container, '2026-08-26'));
    });

    it('takes no focus of its own on mount', () => {
      renderUi(<Calendar defaultValue={AUGUST} />, { locale: 'it' });
      // A grid that focused itself would steal the caret from whatever the page
      // was doing. The effect is guarded on a key or a click having happened,
      // and nothing asserted that.
      expect(document.body).toHaveFocus();
    });
  });

  describe('the grid and its headers are one thing', () => {
    it('starts the rows on the day the headers say', () => {
      // The dates and the column names are computed separately, so this is the
      // assertion that keeps them agreeing: mutating either one alone moves this
      // date. `it` starts on Monday, so August 2026 opens on 27 July.
      const italian = renderUi(<Calendar defaultMonth={AUGUST} />, {
        locale: 'it',
      });
      expect(
        italian.container.querySelector('[data-day]')?.getAttribute('data-day'),
      ).toBe('2026-07-27');

      const american = renderUi(<Calendar defaultMonth={AUGUST} />, {
        locale: 'en-US',
      });
      expect(
        american.container
          .querySelector('[data-day]')
          ?.getAttribute('data-day'),
      ).toBe('2026-07-26');
    });

    it('starts them where an explicit firstDayOfWeek says instead', () => {
      const { container } = renderUi(
        <Calendar defaultMonth={AUGUST} firstDayOfWeek={6} />,
        { locale: 'it' },
      );
      expect(
        container.querySelector('[data-day]')?.getAttribute('data-day'),
      ).toBe('2026-08-01');
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
      // `aria-disabled`, never `disabled`: the APG's "focusable but not
      // activatable". A day the arrows skipped is a day nobody is told about.
      expect(refused).toHaveAttribute('aria-disabled', 'true');
      // And it is still the grid cell it was — the state lives on the element
      // that takes the focus, not on a wrapper around it.
      expect(refused.tagName).toBe('TD');
      expect(refused).toHaveAttribute('role', 'gridcell');
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
      await focusCell(container, '2026-08-14');
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

    it('chooses with Enter, and with Space', async () => {
      const onValueChange = vi.fn();
      const { container } = renderUi(
        <Calendar defaultMonth={AUGUST} onValueChange={onValueChange} />,
        { locale: 'it' },
      );
      // A `<td>` is not a button, so activation is the component's own now —
      // it came free while a button sat inside the cell, and the cell is where
      // the focus and the selected state have to live.
      await focusCell(container, '2026-08-03');
      await browser.keyboard('{Enter}');
      expect(onValueChange).toHaveBeenLastCalledWith({
        year: 2026,
        month: 8,
        day: 3,
      });

      await focusCell(container, '2026-08-04');
      await browser.keyboard(' ');
      expect(onValueChange).toHaveBeenLastCalledWith({
        year: 2026,
        month: 8,
        day: 4,
      });
    });

    it('refuses Enter on a day the predicate refuses', async () => {
      const onValueChange = vi.fn();
      const { container } = renderUi(
        <Calendar
          defaultMonth={AUGUST}
          isDateDisabled={(date) => date.day === 15}
          onValueChange={onValueChange}
        />,
        { locale: 'it' },
      );
      await focusCell(container, '2026-08-15');
      await browser.keyboard('{Enter}');
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('marks the selected cell for the eye and for assistive tech', async () => {
      const { container } = renderUi(<Calendar defaultMonth={AUGUST} />, {
        locale: 'it',
      });
      await browser.click(cell(container, '2026-08-12'));
      // ON THE FOCUSED ELEMENT, which is the point of the shape: measured in
      // Chromium's accessibility tree, a button inside the cell took the focus
      // while the selected state stayed on the cell around it, so the node the
      // user landed on carried no selection at all.
      expect(cell(container, '2026-08-12')).toHaveAttribute(
        'aria-selected',
        'true',
      );
    });

    it('says which month is on screen, for a reader who cannot see it change', async () => {
      const { container } = renderUi(<Calendar defaultValue={AUGUST} />, {
        locale: 'it',
      });
      // SILENT ON ARRIVAL. A live region inserted with its sentence already in
      // it is the canonical case a screen reader does not speak, and mounted
      // inside a `Popover` it would fire on top of the popover's own
      // announcement. The package measured this once already and every other
      // region here starts empty.
      expect(screen.queryByText(/Stai vedendo/)).not.toBeInTheDocument();

      await focusCell(container, '2026-08-12');
      await browser.keyboard('{PageDown}');

      const status = screen.getByText('Stai vedendo settembre 2026');
      expect(status).toHaveAttribute('role', 'status');
    });
  });

  describe('the locale reaches every number, not just the heading', () => {
    it('writes the days in the locale own numerals', () => {
      const { container } = renderUi(<Calendar defaultMonth={AUGUST} />, {
        locale: 'ar-EG',
      });
      // The caption read `أغسطس ٢٠٢٦` while every cell under it read `12` — the
      // same component in two numbering systems, which is the mismatch this
      // family exists to remove.
      expect(cell(container, '2026-08-12')).toHaveTextContent('١٢');
    });

    it('names a two-digit year as itself, not as 19xx', () => {
      renderUi(<Calendar defaultMonth={{ year: 99, month: 1, day: 1 }} />, {
        locale: 'en-GB',
      });
      // `Date.UTC(99, …)` means 1999. The grid went through `setUTCFullYear`
      // and rendered the year 99 while the heading above it said 1999 — the
      // exact trap `civil-date` documents avoiding.
      expect(screen.getByRole('grid')).toHaveAccessibleName('January 99');
    });

    it('gives every day a whole date to be announced by', () => {
      const { container } = renderUi(<Calendar defaultMonth={AUGUST} />, {
        locale: 'en-GB',
      });
      // The visible text is a bare number and the column header adds only a
      // weekday, so a reader arrowing off the 31st heard "1" and was never told
      // which month they had landed in.
      expect(cell(container, '2026-08-12')).toHaveAccessibleName(
        '12 August 2026',
      );
    });

    it('marks today, which nothing did', () => {
      const now = new Date();
      const { container } = renderUi(
        <Calendar
          defaultMonth={{
            year: now.getFullYear(),
            month: now.getMonth() + 1,
            day: 1,
          }}
        />,
        { locale: 'it' },
      );
      const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      expect(cell(container, iso)).toHaveAttribute('aria-current', 'date');
    });
  });

  describe('the month buttons', () => {
    it('names them in the locale and moves the grid', async () => {
      const onMonthChange = vi.fn();
      renderUi(
        <Calendar defaultMonth={AUGUST} onMonthChange={onMonthChange} />,
        { locale: 'it' },
      );
      await browser.click(
        screen.getByRole('button', { name: 'Mese precedente' }),
      );

      expect(screen.getByRole('grid')).toHaveAccessibleName('luglio 2026');
      expect(onMonthChange).toHaveBeenCalledWith({
        year: 2026,
        month: 7,
        day: 1,
      });
    });
  });

  describe('right to left', () => {
    it('moves the ring the way the arrow points, not the way the day counts', async () => {
      const { container } = renderUi(<Calendar defaultValue={AUGUST} />, {
        locale: 'ar-EG',
      });
      await focusCell(container, '2026-08-12');

      // A table under `dir="rtl"` reverses its columns, so yesterday is drawn to
      // the RIGHT. ArrowRight moving to tomorrow would move the ring visually
      // backwards — the package settles this with `useDirection` everywhere
      // else, and this component ships Arabic copy.
      await browser.keyboard('{ArrowRight}');
      expect(cell(container, '2026-08-11')).toHaveFocus();

      await browser.keyboard('{ArrowLeft}');
      expect(cell(container, '2026-08-12')).toHaveFocus();
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

describe('Calendar picking a RANGE', () => {
  const AUG: CivilDate = { year: 2026, month: 8, day: 1 };
  const at = (container: HTMLElement, iso: string) =>
    container.querySelector(`[data-day="${iso}"]`) as HTMLElement;

  it('marks the two ends as selected and the days between as spanned', async () => {
    const { container } = renderUi(
      <Calendar selection="range" defaultMonth={AUG} />,
      { locale: 'it' },
    );

    await browser.click(at(container, '2026-08-12'));
    await browser.click(at(container, '2026-08-15'));

    // The ENDS are the selection; the middle is what the selection covers.
    // A day claiming both would be announced as chosen when it is only spanned.
    expect(at(container, '2026-08-12')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(at(container, '2026-08-15')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    for (const iso of ['2026-08-13', '2026-08-14']) {
      expect(at(container, iso)).toHaveAttribute('data-in-range');
      expect(at(container, iso)).not.toHaveAttribute('aria-selected');
    }
    expect(at(container, '2026-08-12')).not.toHaveAttribute('data-in-range');
  });

  it('hands back a half-made range on the FIRST click', async () => {
    const onValueChange = vi.fn();
    const { container } = renderUi(
      <Calendar
        selection="range"
        defaultMonth={AUG}
        onValueChange={onValueChange}
      />,
      { locale: 'it' },
    );

    await browser.click(at(container, '2026-08-12'));

    // Not silence until the second click: a consumer draws the half-made state
    // — a field showing the start, a trigger label — and cannot if it is not
    // told about it.
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0]?.[0]).toEqual({
      start: { year: 2026, month: 8, day: 12 },
      end: null,
    });
  });

  it('rewinds when the second click is earlier, rather than refusing it', async () => {
    const { container } = renderUi(
      <Calendar selection="range" defaultMonth={AUG} />,
      { locale: 'it' },
    );

    await browser.click(at(container, '2026-08-12'));
    await browser.click(at(container, '2026-08-05'));

    expect(at(container, '2026-08-05')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(at(container, '2026-08-12')).not.toHaveAttribute('aria-selected');
    expect(container.querySelectorAll('[data-in-range]')).toHaveLength(0);
  });

  it('says which end is being chosen, which nothing on screen does', async () => {
    const { container } = renderUi(
      <Calendar selection="range" defaultMonth={AUG} />,
      { locale: 'it' },
    );
    // THE LAST of them. The rendered tree carries three `role="status"`
    // regions and the calendar's is not the first — a review measured a probe
    // reading the wrong one and reporting silence from a component that was
    // speaking.
    const live = () => {
      const all = container.querySelectorAll('[role="status"]');
      return all[all.length - 1]?.textContent ?? '';
    };

    await browser.click(at(container, '2026-08-12'));
    // The half a range adds, and the half sighted testing never notices
    // missing: after the first click the grid is choosing an END.
    expect(live()).toContain('inizio');
    expect(live()).toContain('12 agosto 2026');

    await browser.click(at(container, '2026-08-15'));
    expect(live()).toContain('12 agosto 2026');
    expect(live()).toContain('15 agosto 2026');
  });

  it('chooses with the keyboard through the same door as the pointer', async () => {
    const { container } = renderUi(
      <Calendar selection="range" defaultMonth={AUG} />,
      { locale: 'it' },
    );

    await focusCell(container, '2026-08-12');
    await browser.keyboard('{Enter}');
    await browser.keyboard('{ArrowRight}{ArrowRight}');
    await browser.keyboard('{Enter}');

    expect(at(container, '2026-08-12')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(at(container, '2026-08-14')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(at(container, '2026-08-13')).toHaveAttribute('data-in-range');
  });

  it('spans a range that crosses into the next month', async () => {
    const { container } = renderUi(
      <Calendar selection="range" defaultMonth={AUG} />,
      { locale: 'it' },
    );

    await browser.click(at(container, '2026-08-28'));
    // The grid draws the first days of September in the same six rows.
    await browser.click(at(container, '2026-09-02'));

    expect(at(container, '2026-08-31')).toHaveAttribute('data-in-range');
    expect(at(container, '2026-09-01')).toHaveAttribute('data-in-range');
    expect(at(container, '2026-09-02')).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('names each cell by WHICH of the three it is', async () => {
    const { container } = renderUi(
      <Calendar
        selection="range"
        defaultMonth={AUG}
        defaultValue={{
          start: { year: 2026, month: 8, day: 12 },
          end: { year: 2026, month: 8, day: 15 },
        }}
      />,
      { locale: 'it' },
    );

    // `data-in-range` has no ARIA counterpart, so without a name an end, a
    // spanned day and a day outside were all announced as nothing but their
    // date — the entire middle of the range reaching assistive technology as a
    // fill and nothing else.
    expect(at(container, '2026-08-12')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('inizio'),
    );
    expect(at(container, '2026-08-15')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('fine'),
    );
    expect(at(container, '2026-08-13')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('nell'),
    );
    expect(at(container, '2026-08-11')?.getAttribute('aria-label')).toBe(
      '11 agosto 2026',
    );
  });

  it('says a range is finished even when finishing it changed the month', async () => {
    function Crossing() {
      const [value, setValue] = useState<CivilRange>({
        start: null,
        end: null,
      });
      const [month, setMonth] = useState<CivilDate>(AUG);
      return (
        <Calendar
          selection="range"
          value={value}
          month={month}
          onMonthChange={setMonth}
          onValueChange={(next) => {
            setValue(next);
            // ADR-0027's own recipe step 3: whoever moves the value moves the
            // month with it.
            if (next.start !== null) setMonth(next.end ?? next.start);
          }}
        />
      );
    }
    const { container } = renderUi(<Crossing />, { locale: 'it' });

    await browser.click(at(container, '2026-08-28'));
    await browser.click(at(container, '2026-09-02'));

    // The month effect writes the same state AFTER the commit, so a sentence
    // set during the event used to lose to it — measured, `rangeWhole` never
    // reached the DOM and the reader was told the month had changed instead.
    const all = container.querySelectorAll('[role="status"]');
    const live = all[all.length - 1]?.textContent ?? '';
    expect(live).toContain('28 agosto 2026');
    expect(live).toContain('2 settembre 2026');
  });

  it('opens a stored range on the month it BEGINS in', async () => {
    const { container } = renderUi(
      <Calendar
        selection="range"
        defaultValue={{
          start: { year: 2026, month: 12, day: 20 },
          end: { year: 2027, month: 1, day: 5 },
        }}
      />,
      { locale: 'it' },
    );

    // Measured with the END winning: a December-to-January range opened on
    // January, and the start was not drawn at all — the user was handed the
    // second half of their own booking.
    expect(at(container, '2026-12-20')).not.toBeNull();
    expect(container.querySelector('[data-day][tabindex="0"]')).toHaveAttribute(
      'data-day',
      '2026-12-20',
    );
  });

  it('does not paint a refused day as part of the span', async () => {
    const { container } = renderUi(
      <Calendar
        selection="range"
        defaultMonth={AUG}
        isDateDisabled={(d) => d.day === 13}
        defaultValue={{
          start: { year: 2026, month: 8, day: 12 },
          end: { year: 2026, month: 8, day: 15 },
        }}
      />,
      { locale: 'it' },
    );

    // A cell saying "not for you" AND wearing the span was saying two opposite
    // things at once. Whether a range may cross a blackout day at all is a
    // decision ADR-0027 leaves open; painting it as chosen would take it.
    expect(at(container, '2026-08-13')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(at(container, '2026-08-13')).not.toHaveAttribute('data-in-range');
    expect(at(container, '2026-08-14')).toHaveAttribute('data-in-range');
  });

  it('declares itself multi-selectable, because two cells are selected', () => {
    const { container } = renderUi(
      <Calendar
        selection="range"
        defaultMonth={AUG}
        defaultValue={{
          start: { year: 2026, month: 8, day: 12 },
          end: { year: 2026, month: 8, day: 15 },
        }}
      />,
      { locale: 'it' },
    );

    // A `grid` defaults to `aria-multiselectable="false"` — "only one item may
    // be selected at a time" — while two cells carry `aria-selected`.
    expect(container.querySelector('[role="grid"]')).toHaveAttribute(
      'aria-multiselectable',
      'true',
    );
  });

  it('leaves a DAY calendar saying nothing about multi-selection', () => {
    const { container } = renderUi(<Calendar defaultMonth={AUG} />, {
      locale: 'it',
    });
    expect(container.querySelector('[role="grid"]')).not.toHaveAttribute(
      'aria-multiselectable',
    );
  });

  it('has no accessibility violations with a range on screen', async () => {
    const { container } = renderUi(
      <Calendar
        selection="range"
        defaultMonth={AUG}
        defaultValue={{
          start: { year: 2026, month: 8, day: 12 },
          end: { year: 2026, month: 8, day: 15 },
        }}
      />,
      { locale: 'it' },
    );
    await expectNoA11yViolations(container);
  });
});

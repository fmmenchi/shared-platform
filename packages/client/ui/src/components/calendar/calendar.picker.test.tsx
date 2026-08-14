import { describe, it, expect, vi } from 'vitest';
import { useRef, useState } from 'react';
import { screen } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { Calendar } from './calendar.component.js';
import { DateInput } from '../date-input/date-input.component.js';
import { Popover } from '../popover/popover.component.js';
import { PopoverTrigger } from '../popover-trigger/popover-trigger.component.js';
import { PopoverContent } from '../popover-content/popover-content.component.js';
import { Button } from '../button/button.component.js';
import { writeDateInput } from '../../date/write-date-input.js';
import { renderUi } from '../../test/render.js';
import type { CivilDate } from '../../date/civil-date.types.js';

/**
 * THE COMPOSITION ADR-0027 PROMISES, and the only place it is proved.
 *
 * "It ships standalone, composes with `Popover` for the picker form, and SETS
 * the field rather than replacing it — the field remains the field." Three
 * components and a claim about how they fit; nothing exercised the fit until
 * this file, and the fit is where the interesting failures live.
 */
const AUGUST: CivilDate = { year: 2026, month: 8, day: 1 };

function Picker({ onChange }: { onChange?: (value: string) => void }) {
  const carrier = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<CivilDate | null>(null);
  // THE MONTH IS THE COMPOSITION'S, and this is the piece a consumer is most
  // likely to leave out. The calendar does not follow the selection on its own:
  // only the thing holding both knows whether the value moved BECAUSE of the
  // grid or in spite of it, and following it from inside would undo the
  // navigation the user just made.
  const [month, setMonth] = useState<CivilDate>(AUGUST);
  const take = (date: CivilDate | null) => {
    setPicked(date);
    if (date !== null) setMonth(date);
  };
  return (
    <form>
      <DateInput
        name="departure"
        aria-label="Partenza"
        carrierRef={carrier}
        // The other direction: what is typed reaches the calendar, so the two
        // never disagree about which day is chosen.
        onDateChange={take}
        onChange={(event) => onChange?.(event.currentTarget.value)}
      />
      <Popover open={open} onOpenChange={setOpen}>
        {/* `PopoverTrigger` is itself a `Button`; nesting one inside it is
            two interactive controls in one place. */}
        <PopoverTrigger aria-label="Scegli">📅</PopoverTrigger>
        <PopoverContent>
          <Calendar
            value={picked}
            month={month}
            onMonthChange={setMonth}
            onValueChange={(date) => {
              setPicked(date);
              writeDateInput(carrier.current, date);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </form>
  );
}

describe('Calendar inside a Popover, setting a DateInput', () => {
  it('writes the picked day into the field, in the locale order', async () => {
    const { container } = renderUi(<Picker />, { locale: 'it' });

    await browser.click(screen.getByRole('button', { name: 'Scegli' }));
    await browser.click(
      container.querySelector('[data-day="2026-08-12"]') as HTMLElement,
    );

    // The field SHOWS the date the way the reader's locale writes it…
    expect(screen.getByRole('textbox', { name: 'Partenza' })).toHaveValue(
      '12/08/2026',
    );
    // …and POSTS the ISO, which is the whole division of labour.
    const form = container.querySelector('form') as HTMLFormElement;
    expect(new FormData(form).getAll('departure')).toEqual(['2026-08-12']);
  });

  it('tells a form binding, because it writes the way a keystroke does', async () => {
    const onChange = vi.fn();
    const { container } = renderUi(<Picker onChange={onChange} />, {
      locale: 'it',
    });

    await browser.click(screen.getByRole('button', { name: 'Scegli' }));
    await browser.click(
      container.querySelector('[data-day="2026-08-12"]') as HTMLElement,
    );

    // A plain `.value =` would update the DOM and tell nobody: React's value
    // tracker absorbs it and the synthetic change never fires. That is the one
    // thing `writeDateInput` exists to get right.
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.lastCall?.[0]).toBe('2026-08-12');
  });

  it('leaves the field a field — it can still be typed into afterwards', async () => {
    const { container } = renderUi(<Picker />, { locale: 'it' });

    await browser.click(screen.getByRole('button', { name: 'Scegli' }));
    await browser.click(
      container.querySelector('[data-day="2026-08-12"]') as HTMLElement,
    );

    const field = screen.getByRole('textbox', { name: 'Partenza' });
    await browser.fill(field, '01012000');

    expect(field).toHaveValue('01/01/2000');
    const form = container.querySelector('form') as HTMLFormElement;
    expect(new FormData(form).getAll('departure')).toEqual(['2000-01-01']);
  });

  it('carries a typed date back to the calendar, so the two never disagree', async () => {
    const { container } = renderUi(<Picker />, { locale: 'it' });

    // Typed, not picked. Without the return path the highlight would stay on
    // whatever was last chosen from the grid, so reopening the popover would
    // show a selection the field no longer holds.
    await browser.fill(
      screen.getByRole('textbox', { name: 'Partenza' }),
      '20082026',
    );
    await browser.click(screen.getByRole('button', { name: 'Scegli' }));

    expect(container.querySelector('[data-day="2026-08-20"]')).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('opens on the month of a date typed into the field, not on the old one', async () => {
    const { container } = renderUi(<Picker />, { locale: 'it' });

    // A date in ANOTHER month than the one the calendar opened on. Carrying the
    // selection back is not enough on its own: the grid draws August 2026, so a
    // December 2027 selection is a day it does not draw at all, and the calendar
    // opens showing nothing selected. The month has to travel with the value,
    // which is the composition's job and is why `Picker` above holds it.
    await browser.fill(
      screen.getByRole('textbox', { name: 'Partenza' }),
      '20122027',
    );
    await browser.click(screen.getByRole('button', { name: 'Scegli' }));

    const day = container.querySelector('[data-day="2027-12-20"]');
    expect(day).not.toBeNull();
    expect(day).toHaveAttribute('aria-selected', 'true');
  });

  it('stays where the user navigated, while the selection has not moved', async () => {
    const { container } = renderUi(<Picker />, { locale: 'it' });

    await browser.fill(
      screen.getByRole('textbox', { name: 'Partenza' }),
      '20082026',
    );
    await browser.click(screen.getByRole('button', { name: 'Scegli' }));
    await browser.click(
      screen.getByRole('button', { name: 'Mese successivo' }),
    );

    // The other half of the rule above, and the half that a calendar following
    // its own value would break: browsing away from the selected month is a
    // thing the user did on purpose, and only a CHANGE of selection may undo it.
    expect(container.querySelector('[data-day="2026-09-15"]')).not.toBeNull();
    expect(container.querySelector('[data-day="2026-08-20"]')).toBeNull();
  });

  it('clears the field when the picker hands back nothing', async () => {
    function ClearablePicker() {
      const carrier = useRef<HTMLInputElement>(null);
      return (
        <form>
          <DateInput
            name="departure"
            aria-label="Partenza"
            carrierRef={carrier}
            defaultValue="2026-08-12"
          />
          <Button onClick={() => writeDateInput(carrier.current, null)}>
            Svuota
          </Button>
        </form>
      );
    }
    const { container } = renderUi(<ClearablePicker />, { locale: 'it' });
    expect(screen.getByRole('textbox', { name: 'Partenza' })).toHaveValue(
      '12/08/2026',
    );

    await browser.click(screen.getByRole('button', { name: 'Svuota' }));

    const form = container.querySelector('form') as HTMLFormElement;
    expect(new FormData(form).getAll('departure')).toEqual(['']);
  });
});

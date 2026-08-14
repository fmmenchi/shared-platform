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
function Picker({ onChange }: { onChange?: (value: string) => void }) {
  const carrier = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<CivilDate | null>(null);
  return (
    <form>
      <DateInput
        name="departure"
        aria-label="Partenza"
        carrierRef={carrier}
        onChange={(event) => onChange?.(event.currentTarget.value)}
      />
      <Popover open={open} onOpenChange={setOpen}>
        {/* `PopoverTrigger` is itself a `Button`; nesting one inside it is
            two interactive controls in one place. */}
        <PopoverTrigger aria-label="Scegli">📅</PopoverTrigger>
        <PopoverContent>
          <Calendar
            value={picked}
            defaultMonth={{ year: 2026, month: 8, day: 1 }}
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

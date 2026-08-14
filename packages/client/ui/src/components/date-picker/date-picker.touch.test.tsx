import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { DatePicker } from './date-picker.component.js';
import { renderUi } from '../../test/render.js';

/**
 * THE PICKER UNDER A FINGER — a separate file because that is how this suite
 * runs a coarse pointer, and because the shape is different there rather than
 * merely bigger.
 */
describe('DatePicker under a coarse pointer', () => {
  const open = () =>
    browser.click(
      screen.getByRole('button', { name: 'Scegli dal calendario' }),
    );

  it('is running the coarse-pointer project, which the rest of this rests on', () => {
    expect(window.matchMedia('(pointer: coarse)').matches).toBe(true);
  });

  it('keeps every day a 44px target, which the anchored shape could not', async () => {
    const { container } = renderUi(
      <DatePicker name="d" aria-label="Data" defaultValue="2026-08-12" />,
      { locale: 'it' },
    );
    await open();

    // `PopoverContent` caps every surface at 320px, which is right for the
    // popovers it was written for and too narrow for a calendar: measured, the
    // grid came out 286px and its cells 38px — below the 44px `Calendar`'s own
    // stylesheet promises for WCAG 2.5.8, and below what every other control
    // here guarantees under the same media query.
    const day = container.querySelector('[data-day]') as HTMLElement;
    const box = day.getBoundingClientRect();
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  });

  it('centres itself instead of hanging off the trigger', async () => {
    const { container } = renderUi(
      <DatePicker name="d" aria-label="Data" defaultValue="2026-08-12" />,
      { locale: 'it' },
    );
    await open();

    const box = (
      container.querySelector('dialog') as HTMLElement
    ).getBoundingClientRect();
    const slack = Math.abs(box.left - (window.innerWidth - box.right));
    // Centred to within a pixel, and inside the viewport on both edges — the
    // anchored version put its right edge past the screen and left the last two
    // columns of every week unreachable.
    expect(slack).toBeLessThanOrEqual(1);
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(window.innerWidth);
  });

  it('still lets a day be chosen, and still writes the field', async () => {
    const { container } = renderUi(
      <form>
        <DatePicker name="d" aria-label="Data" defaultValue="2026-08-01" />
      </form>,
      { locale: 'it' },
    );
    await open();

    // The columns the anchored shape pushed off-screen: a click there did not
    // fail, it silently did nothing.
    await browser.click(
      container.querySelector('[data-day="2026-08-30"]') as HTMLElement,
    );

    expect(screen.getByRole('textbox', { name: 'Data' })).toHaveValue(
      '30/08/2026',
    );
    const form = container.querySelector('form') as HTMLFormElement;
    expect(new FormData(form).getAll('d')).toEqual(['2026-08-30']);
  });
});

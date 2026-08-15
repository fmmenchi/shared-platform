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
    // grid came out 286px and its cells 37.95px WIDE — below the 44px
    // `Calendar`'s own stylesheet promises for WCAG 2.5.8. (The HEIGHT stayed
    // 46px; the compression is horizontal, and an earlier comment here said
    // "38px cells" as though both had shrunk.)
    //
    // THE FLOOR IS THE SCREEN, and this test runs at 390. Measured across the
    // cap the viewport sets: 390→46.00, 374→46.00, 360→44.14, 356→43.52,
    // 344→41.66, 320→37.95. So 44px holds from about 360px up — which clears
    // the commonest Android width and does not clear a 320px one, where the
    // grid falls back to what the anchored shape gave everywhere. Below 44 it
    // is still far above the 24px WCAG AA minimum; 44 is this package's own
    // policy, not the legal floor.
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
    // Centred to within a pixel, and inside both edges. NOT because the
    // anchored shape overflowed — it did not: `shift({ padding: 8 })` in the
    // positioning primitive kept it on screen, and a review measured the
    // supposedly unreachable cells reachable. What the anchored shape got wrong
    // was the WIDTH, and this is the assertion for the position it now takes.
    expect(slack).toBeLessThanOrEqual(1);
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(window.innerWidth);
  });

  it('shows the whole month wherever the field sits on the page', async () => {
    const { container } = renderUi(
      <div style={{ paddingTop: '300px', paddingBottom: '2000px' }}>
        <DatePicker name="d" aria-label="Data" defaultValue="2026-08-12" />
      </div>,
      { locale: 'it' },
    );
    await open();
    const dialog = container.querySelector('dialog') as HTMLElement;

    // `PopoverContent` caps its height by the room measured ABOVE OR BELOW THE
    // TRIGGER — right while the box hangs off it, wrong once it does not.
    // Measured before the repair, with the field 300px down a 664px screen:
    // the card was 288px tall with 188px of empty viewport above and below, and
    // the grid ended at the 23rd. Two week rows inside an `overflow: auto`,
    // with nothing on screen to say so.
    expect(dialog.scrollHeight - dialog.clientHeight).toBe(0);
    expect(container.querySelector('[data-day="2026-08-31"]')).not.toBeNull();
  });

  it('is as tall as its content, not as tall as it is allowed to be', async () => {
    const { container } = renderUi(
      <DatePicker name="d" aria-label="Data" defaultValue="2026-08-12" />,
      { locale: 'it' },
    );
    await open();
    const dialog = container.querySelector('dialog') as HTMLElement;
    const grid = dialog.querySelector('table') as HTMLElement;

    // `block-size: fit-content` is load-bearing and nothing asserted it: with
    // `auto` the card stretched to the height cap — measured 588px, with about
    // 190px of empty space under the grid — and every other assertion in this
    // file still passed.
    const card = dialog.getBoundingClientRect().height;
    const content =
      grid.getBoundingClientRect().bottom - dialog.getBoundingClientRect().top;
    expect(card - content).toBeLessThan(32);
  });

  it('still lets a day be chosen, and still writes the field', async () => {
    const { container } = renderUi(
      <form>
        <DatePicker name="d" aria-label="Data" defaultValue="2026-08-01" />
      </form>,
      { locale: 'it' },
    );
    await open();

    // A cell in the last column, which is where a width problem would show
    // first. This survives every mutant of the new rule — the anchored shape
    // could be clicked here too — so it is a regression test for the picker
    // rather than evidence for the shape.
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

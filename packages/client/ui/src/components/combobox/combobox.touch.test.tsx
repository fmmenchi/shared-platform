import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { Combobox } from './combobox.component.js';

interface City {
  id: string;
  name: string;
}

const CITIES: City[] = [
  { id: '1', name: 'Milano' },
  { id: '2', name: 'Torino' },
];

const wiring = {
  items: CITIES,
  getKey: (city: City) => city.id,
  getLabel: (city: City) => city.name,
};

/**
 * UNDER A FINGER — the `touch` project, where `(pointer: coarse)` is on.
 *
 * The component's docs make two hard claims about this branch and nothing was
 * verifying either. One of them was measured WRONG: the surface centred with
 * `inset: 0; margin: auto; top: auto; left: auto`, and setting two of the four
 * anchors back to `auto` makes the box solve for the other two — it landed in
 * the bottom-right CORNER, which on a phone is behind the software keyboard
 * that is always up, since the list opens by typing. `DatePicker`'s stylesheet
 * had already recorded that exact mistake, measured.
 */
describe('Combobox under a coarse pointer', () => {
  it('is running in the coarse project at all', () => {
    // Without this the rest could pass by being at `pointer: fine`, which is
    // what the default project is.
    expect(window.matchMedia('(pointer: coarse)').matches).toBe(true);
  });

  it('centres the list rather than parking it in a corner', async () => {
    render(<Combobox {...wiring} aria-label="City" />);

    await browser.click(screen.getByRole('combobox'));
    await waitFor(() => {
      expect(screen.getAllByRole('option')).toHaveLength(2);
    });

    const surface = screen
      .getAllByRole('option')[0]
      ?.closest('[popover]') as HTMLElement;
    const box = surface.getBoundingClientRect();
    const centreX = box.left + box.width / 2;
    const centreY = box.top + box.height / 2;

    // Centred to within a pixel or two of the viewport's middle on both axes.
    // The corner bug measured 440,582 in a 600x600 viewport — nowhere near.
    expect(Math.abs(centreX - window.innerWidth / 2)).toBeLessThan(2);
    expect(Math.abs(centreY - window.innerHeight / 2)).toBeLessThan(2);
  });

  it('gives every row a finger-sized target', async () => {
    render(<Combobox {...wiring} aria-label="City" />);

    await browser.click(screen.getByRole('combobox'));
    await waitFor(() => {
      expect(screen.getAllByRole('option')).toHaveLength(2);
    });

    for (const option of screen.getAllByRole('option')) {
      // WCAG 2.5.8, and the same 44px every other control in this package
      // guarantees under the same query.
      expect(option.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    }
  });

  it('gives the field itself the same 44px', () => {
    render(<Combobox {...wiring} aria-label="City" />);
    // Inherited from `control-md`, and never asserted for this control until
    // now — the shared utility is what makes it true, and this is what keeps it.
    expect(
      screen.getByRole('combobox').getBoundingClientRect().height,
    ).toBeGreaterThanOrEqual(44);
  });
});

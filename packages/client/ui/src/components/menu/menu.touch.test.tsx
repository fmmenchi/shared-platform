import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from '@vitest/browser/context';
import { Menu } from './menu.component.js';
import { MenuTrigger } from '../menu-trigger/menu-trigger.component.js';
import { MenuContent } from '../menu-content/menu-content.component.js';
import { MenuItem } from '../menu-item/menu-item.component.js';

/**
 * The touch form. This file runs in its OWN browser — one that reports a coarse
 * pointer — because that is the only way a media query has anything to say. In
 * the ordinary suite the browser reports `pointer: fine` and every assertion
 * below would be measuring the desktop form while claiming to measure this one.
 */
const commands = (count = 3) => (
  <Menu>
    <MenuTrigger>Actions</MenuTrigger>
    <MenuContent>
      {Array.from({ length: count }, (_, index) => (
        <MenuItem key={index}>Command {index}</MenuItem>
      ))}
    </MenuContent>
  </Menu>
);

const open = async () => {
  await browser.click(screen.getByRole('button', { name: 'Actions' }));
  await waitFor(() =>
    expect(screen.getByRole('menu').matches(':popover-open')).toBe(true),
  );
  const surface = screen.getByRole('menu');
  // ARRIVED, not merely open: the sheet slides up from the bottom edge, so a
  // rect read on the frame it opens is a rect of it still travelling —
  // measured, 60px below the screen, which is 40% of its own height.
  await Promise.all(surface.getAnimations().map((a) => a.finished));
  return surface;
};

describe('Menu on a touch screen', () => {
  it('is a sheet on the bottom edge, not a dropdown by the trigger', async () => {
    render(commands());
    const box = (await open()).getBoundingClientRect();

    // A dropdown pinned to its control sits under the thumb that opened it, and
    // on a phone the control is as often as not in the bottom half.
    expect(Math.round(box.bottom)).toBe(window.innerHeight);
    expect(Math.round(box.left)).toBe(0);
    expect(Math.round(box.width)).toBe(window.innerWidth);
  });

  it('caps itself with the screen, not with the room beside the anchor', async () => {
    render(commands(40));
    const surface = await open();

    // The anchored cap is the room BESIDE the anchor, which says nothing about
    // a box that does not sit beside it.
    const box = surface.getBoundingClientRect();
    expect(box.height).toBeLessThanOrEqual(window.innerHeight * 0.7);
    expect(Math.round(box.bottom)).toBe(window.innerHeight);
    // …and the commands it cannot show are still reachable.
    expect(surface.scrollHeight).toBeGreaterThan(surface.clientHeight);
  });

  it('gives a finger something to hit', async () => {
    render(commands());
    await open();

    // 44px is what every touch platform asks for, and WCAG's enhanced target
    // size. The row is full width already; only its height was short.
    for (const command of screen.getAllByRole('menuitem')) {
      expect(command.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    }
  });

  it('still reports where it would have been anchored', async () => {
    render(commands());
    const surface = await open();

    // DECLINED, not absent — which is what lets a consumer take the anchored
    // form back with one rule, and takes no `!important` to do either way.
    expect(surface.style.getPropertyValue('--anchored-x')).not.toBe('');
    expect(surface.style.getPropertyValue('--anchored-y')).not.toBe('');
  });

  it('answers the keyboard the way it does anywhere else', async () => {
    render(commands());
    await open();

    // The form changed; the contract did not. A phone with a keyboard, or a
    // switch device, is still a keyboard.
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('menuitem', { name: 'Command 0' }),
      ),
    );
    await browser.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(
      screen.getByRole('menuitem', { name: 'Command 1' }),
    );
  });
});

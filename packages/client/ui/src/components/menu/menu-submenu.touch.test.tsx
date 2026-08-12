import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { Menu } from './menu.component.js';
import { MenuTrigger } from '../menu-trigger/menu-trigger.component.js';
import { MenuContent } from '../menu-content/menu-content.component.js';
import { MenuItem } from '../menu-item/menu-item.component.js';
import { MenuItemTrigger } from '../menu-item-trigger/menu-item-trigger.component.js';

/**
 * A submenu on a touch screen. This file runs in the browser that reports a
 * coarse pointer — in the ordinary suite the parent never steps aside, and
 * every assertion here would be measuring the desktop form.
 */
const example = () => (
  <Menu>
    <MenuTrigger>Actions</MenuTrigger>
    <MenuContent>
      <MenuItem>Rename</MenuItem>
      <Menu>
        <MenuItemTrigger>Share</MenuItemTrigger>
        <MenuContent>
          <MenuItem>Email</MenuItem>
          <MenuItem>Copy link</MenuItem>
        </MenuContent>
      </Menu>
      <MenuItem>Delete</MenuItem>
    </MenuContent>
  </Menu>
);

const item = (name: string) => screen.getByRole('menuitem', { name });

/**
 * Every surface in the DOM, open or not — asked with `hidden` because a menu
 * that has stepped aside is `visibility: hidden`, which takes it out of the
 * ACCESSIBILITY TREE as well as off the screen. That is the right outcome and
 * worth stating: while a submenu has the screen, a screen reader is not offered
 * the commands of the menu behind it either.
 */
const surfaces = () => screen.getAllByRole('menu', { hidden: true });
const openSurfaces = () =>
  surfaces().filter((surface) => surface.matches(':popover-open'));

const openBoth = async () => {
  render(example());
  await browser.click(screen.getByRole('button', { name: 'Actions' }));
  await waitFor(() => expect(document.activeElement).toBe(item('Rename')));
  await browser.click(item('Share'));
  await waitFor(() => expect(openSurfaces()).toHaveLength(2));
  const [parent, child] = openSurfaces();
  await Promise.all((child?.getAnimations() ?? []).map((a) => a.finished));
  return { parent: parent as HTMLElement, child: child as HTMLElement };
};

describe('A submenu on a touch screen', () => {
  it('has the screen to itself while it is open', async () => {
    const { parent, child } = await openBoth();

    // Two sheets on one bottom edge read as ONE list with two of its rows
    // silently swapped — measured on a phone before this: the child covered the
    // parent from below, and what showed above it were the rows the user had
    // not chosen.
    expect(getComputedStyle(parent).visibility).toBe('hidden');
    expect(getComputedStyle(child).visibility).toBe('visible');

    // The paint, not the state: the parent popover is still open, which is what
    // keeps the nesting, the level-at-a-time Escape and the whole-stack close
    // the platform's rather than ours.
    expect(parent.matches(':popover-open')).toBe(true);
  });

  it('is a sheet of its own height, on the bottom edge', async () => {
    const { child } = await openBoth();
    const box = child.getBoundingClientRect();

    expect(Math.round(box.bottom)).toBe(window.innerHeight);
    expect(Math.round(box.width)).toBe(window.innerWidth);
    // Its OWN height: covering the parent by fixing a height leaves most of the
    // sheet empty when a submenu has two commands, which is what it usually has.
    expect(box.height).toBeLessThan(window.innerHeight * 0.5);
  });

  it('offers the way back that the arrows are on a keyboard', async () => {
    const { child } = await openBoth();

    // Without it the only way out of a submenu on a phone would be to dismiss
    // the lot: the parent has stepped aside, so a tap outside the child reaches
    // the page, not the menu behind it.
    const back = screen.getByRole('menuitem', { name: /Back to Share/i });
    expect(child.contains(back)).toBe(true);
    expect(back.textContent).toContain('Share');

    await browser.click(back);
    await waitFor(() => expect(openSurfaces()).toHaveLength(1));
    // …and it leaves the focus where the arrow would have left it, on the
    // command that led here, with the menu it belongs to back on screen.
    await waitFor(() => expect(document.activeElement).toBe(item('Share')));
    expect(getComputedStyle(openSurfaces()[0] as HTMLElement).visibility).toBe(
      'visible',
    );
  });

  it('makes the way back a command like any other', async () => {
    await openBoth();
    const back = screen.getByRole('menuitem', { name: /Back to Share/i });

    // A `role="menuitem"` the arrows cannot reach is the exact thing this
    // package refuses everywhere else, and it was one: not registered, so
    // `step()` walked past it, and tabbable by default, so a menu that is one
    // Tab stop had two.
    expect(back.tabIndex).toBe(-1);
    expect(document.activeElement).toBe(item('Email'));

    // Reachable, and NOT where the submenu opens: the user has just come in.
    await browser.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(back);
    expect(back.tabIndex).toBe(0);
    await browser.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(item('Email'));
  });

  it('calls the command by the name it is announced by', async () => {
    render(
      <Menu>
        <MenuTrigger>Actions</MenuTrigger>
        <MenuContent>
          <Menu>
            <MenuItemTrigger aria-label="Share">
              <span aria-hidden="true">↗</span>
            </MenuItemTrigger>
            <MenuContent>
              <MenuItem>Email</MenuItem>
            </MenuContent>
          </Menu>
        </MenuContent>
      </Menu>,
    );
    await browser.click(screen.getByRole('button', { name: 'Actions' }));
    await waitFor(() => expect(document.activeElement).toBe(item('Share')));
    await browser.click(item('Share'));

    // Read from `textContent`, this announced "Back to" and drew a bare
    // chevron — for a trigger whose whole label is an `aria-label`, which is
    // what an icon-only command is. Typing already had the right answer.
    await waitFor(() =>
      expect(
        screen.getByRole('menuitem', { name: /Back to Share/i }),
      ).toBeInTheDocument(),
    );
  });

  it('gives the way back a finger to hit', async () => {
    await openBoth();
    const back = screen.getByRole('menuitem', { name: /Back to Share/i });
    expect(back.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  });
});

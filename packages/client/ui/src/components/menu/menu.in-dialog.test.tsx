import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { Dialog } from '../dialog/dialog.component.js';
import { DialogTrigger } from '../dialog-trigger/dialog-trigger.component.js';
import { DialogContent } from '../dialog-content/dialog-content.component.js';
import { DialogHeading } from '../dialog-heading/dialog-heading.component.js';
import { Menu } from './menu.component.js';
import { MenuTrigger } from '../menu-trigger/menu-trigger.component.js';
import { MenuContent } from '../menu-content/menu-content.component.js';
import { MenuItem } from '../menu-item/menu-item.component.js';

/**
 * A MENU INSIDE A MODAL DIALOG, which is the composition a drawer makes routine:
 * a `<dialog>` opened with `showModal()` makes everything outside it inert and
 * takes the top layer, and a menu is a popover that wants the same layer.
 *
 * Nothing here is ours — it is the platform's top-layer unwinding, measured
 * because "these two cannot coexist" is exactly the kind of thing that sounds
 * true. It is not, and the reason to pin it is that the day it stops being
 * true, a menu would open BEHIND the dialog that contains it and `Escape`
 * would take the whole dialog away instead of the menu.
 */
describe('a menu inside a modal dialog', () => {
  it('opens above it, keeps its keys, and unwinds one layer at a time', async () => {
    render(
      <Dialog>
        <DialogTrigger>Settings</DialogTrigger>
        <DialogContent>
          <DialogHeading>Settings</DialogHeading>
          <p data-testid="inside">Some dialog content</p>
          <Menu>
            <MenuTrigger>Actions</MenuTrigger>
            <MenuContent>
              <MenuItem>Rename</MenuItem>
              <MenuItem>Delete</MenuItem>
            </MenuContent>
          </Menu>
        </DialogContent>
      </Dialog>,
    );

    await browser.click(screen.getByRole('button', { name: 'Settings' }));
    const dialog = document.querySelector('dialog') as HTMLDialogElement;
    await waitFor(() => expect(dialog.open).toBe(true));
    expect(dialog.matches(':modal')).toBe(true);

    // 1. Can the menu inside an INERT-making modal even open?
    await browser.click(screen.getByRole('button', { name: 'Actions' }));
    const surface = screen.getByRole('menu');
    await waitFor(() => expect(surface.matches(':popover-open')).toBe(true));
    await Promise.all(surface.getAnimations().map((a) => a.finished));
    // The page outside a modal dialog is inert; the menu is INSIDE it, so it
    // opens and takes the focus like anywhere else.
    expect(document.activeElement).toBe(
      screen.getByRole('menuitem', { name: 'Rename' }),
    );

    // 2. Does it PAINT above the dialog, or behind it?
    const top = document.elementFromPoint(
      Math.round(surface.getBoundingClientRect().left + 5),
      Math.round(surface.getBoundingClientRect().top + 5),
    );
    expect(top?.closest('[role="menu"]')).toBe(surface);

    // 3. Do the menu's own keys still work in there?
    await browser.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(
      screen.getByRole('menuitem', { name: 'Delete' }),
    );

    // 4. WHOSE Escape is it? The menu's first, then the dialog's.
    await browser.keyboard('{Escape}');
    await waitFor(() => expect(surface.matches(':popover-open')).toBe(false));
    // ONE LAYER at a time: the menu goes and the dialog stays.
    expect(dialog.open).toBe(true);
    await browser.keyboard('{Escape}');
    await waitFor(() => expect(dialog.open).toBe(false));
    expect(dialog.open).toBe(false);
  });
});

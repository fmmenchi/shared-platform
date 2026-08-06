import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from '@vitest/browser/context';
import { Menu } from './menu.component.js';
import { MenuTrigger } from '../menu-trigger/menu-trigger.component.js';
import { MenuContent } from '../menu-content/menu-content.component.js';
import { MenuItem } from '../menu-item/menu-item.component.js';
import { MenuItemTrigger } from '../menu-item-trigger/menu-item-trigger.component.js';
import { renderUi } from '../../test/render.js';

/**
 * A submenu is a `Menu` inside a `MenuContent`. Nothing else declares it, and
 * nothing else has to: the platform nests two popovers by the invoker
 * relationship alone — measured in Chromium, Gecko and WebKit, opening the
 * inner one leaves the outer open, `Escape` unwinds a level at a time, and
 * hiding the outer hides everything in it.
 */
const example = (handlers: { onEmail?: () => void } = {}) => (
  <Menu>
    <MenuTrigger>Actions</MenuTrigger>
    <MenuContent>
      <MenuItem>Rename</MenuItem>
      <Menu>
        <MenuItemTrigger>Share</MenuItemTrigger>
        <MenuContent>
          <MenuItem onClick={handlers.onEmail}>Email</MenuItem>
          <MenuItem>Copy link</MenuItem>
        </MenuContent>
      </Menu>
      <MenuItem>Delete</MenuItem>
    </MenuContent>
  </Menu>
);

const item = (name: string) => screen.getByRole('menuitem', { name });
const menus = () => screen.getAllByRole('menu');
const open = async () => {
  await browser.click(screen.getByRole('button', { name: 'Actions' }));
  await waitFor(() => expect(document.activeElement).toBe(item('Rename')));
};

describe('Menu with a submenu', () => {
  it('announces the command that opens one', async () => {
    render(example());
    await open();

    const trigger = item('Share');
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await browser.click(trigger);
    await waitFor(() =>
      expect(trigger).toHaveAttribute('aria-expanded', 'true'),
    );
  });

  it('belongs to the menu it sits in, not to the one it opens', async () => {
    render(example());
    await open();

    // THE trick, and the reason this cannot be a `MenuItem`: a `Menu` inside a
    // `MenuContent` shadows the outer context, so an item written here would
    // register with the menu it OPENS — unreachable by the arrows that should
    // reach it, and counted among the commands it leads to.
    await browser.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(item('Share'));
    await browser.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(item('Delete'));
  });

  it('opens sideways from the keyboard, and comes back', async () => {
    render(example());
    await open();

    await browser.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(item('Share'));

    // Into the submenu. The APG's key for it, and the focus lands on the first
    // command of the one that opened.
    await browser.keyboard('{ArrowRight}');
    await waitFor(() => expect(document.activeElement).toBe(item('Email')));
    // …and the parent is still open behind it.
    expect(menus()).toHaveLength(2);

    // Back: one level, like Escape, and the command that opened it takes the
    // focus.
    await browser.keyboard('{ArrowLeft}');
    await waitFor(() => expect(document.activeElement).toBe(item('Share')));
    expect(menus()).toHaveLength(1);
  });

  it('reads the arrows in the reader’s direction', async () => {
    renderUi(example(), { locale: 'ar' });
    await open();
    await browser.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(item('Share'));

    // Right to left, the submenu opens on the other side — so the key that
    // means "into it" is the other one. Nothing about this is a prop: the
    // direction comes from the locale the design system already requires.
    await browser.keyboard('{ArrowLeft}');
    await waitFor(() => expect(document.activeElement).toBe(item('Email')));

    await browser.keyboard('{ArrowRight}');
    await waitFor(() => expect(document.activeElement).toBe(item('Share')));
  });

  it('keeps the two sets of commands apart', async () => {
    render(example());
    await open();
    await browser.click(item('Share'));
    await waitFor(() => expect(document.activeElement).toBe(item('Email')));

    // Typing inside the submenu reaches the submenu's commands only: the two
    // families are separate by construction, because a part registers with the
    // family it was given and not with the marker it carries.
    await browser.keyboard('c');
    expect(document.activeElement).toBe(item('Copy link'));

    // …and the arrows wrap inside it rather than escaping to the parent.
    await browser.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(item('Email'));
  });

  it('runs a command and takes the whole stack with it', async () => {
    const onEmail = vi.fn();
    render(example({ onEmail }));
    await open();
    await browser.click(item('Share'));
    await waitFor(() => expect(document.activeElement).toBe(item('Email')));

    await browser.keyboard('{Enter}');
    expect(onEmail).toHaveBeenCalledTimes(1);

    // Leaving the parent standing would show the user a list of things they
    // have already done. One call: hiding the root hides what is nested in it.
    await waitFor(() =>
      expect(
        screen
          .getAllByRole('menu', { hidden: true })
          .some((surface) => surface.matches(':popover-open')),
      ).toBe(false),
    );
  });

  it('unwinds one level per Escape', async () => {
    render(example());
    const trigger = screen.getByRole('button', { name: 'Actions' });
    await open();
    await browser.click(item('Share'));
    await waitFor(() => expect(menus()).toHaveLength(2));

    // The platform's own stack discipline — nothing here keeps a list of what
    // is open.
    await browser.keyboard('{Escape}');
    await waitFor(() => expect(menus()).toHaveLength(1));

    await browser.keyboard('{Escape}');
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it('will not open an inert submenu', async () => {
    render(
      <Menu>
        <MenuTrigger>Actions</MenuTrigger>
        <MenuContent>
          <MenuItem>Rename</MenuItem>
          <Menu>
            <MenuItemTrigger disabled>Share</MenuItemTrigger>
            <MenuContent>
              <MenuItem>Email</MenuItem>
            </MenuContent>
          </Menu>
        </MenuContent>
      </Menu>,
    );
    await open();

    // Focusable and reachable, like any disabled command — it simply does not
    // open. `popovertarget` has to come off, or the platform opens it without
    // asking anybody.
    await browser.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(item('Share'));
    expect(item('Share')).toHaveAttribute('aria-disabled', 'true');

    await browser.keyboard('{ArrowRight}');
    await browser.keyboard('{Enter}');
    expect(menus()).toHaveLength(1);
  });
});

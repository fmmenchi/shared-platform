import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from '@vitest/browser/context';
import { Menu } from './menu.component.js';
import { MenuTrigger } from '../menu-trigger/menu-trigger.component.js';
import { MenuContent } from '../menu-content/menu-content.component.js';
import { MenuItem } from '../menu-item/menu-item.component.js';
import { MenuItemCheckbox } from '../menu-item-checkbox/menu-item-checkbox.component.js';
import { MenuItemRadio } from '../menu-item-radio/menu-item-radio.component.js';
import { MenuGroup } from '../menu-group/menu-group.component.js';
import { MenuSeparator } from '../menu-separator/menu-separator.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

const view = (extra?: React.ReactNode) => (
  <>
    <button type="button">Before</button>
    <Menu>
      <MenuTrigger>View</MenuTrigger>
      <MenuContent>
        <MenuItem>Reload</MenuItem>
        <MenuSeparator />
        <MenuItemCheckbox defaultChecked>Show sidebar</MenuItemCheckbox>
        <MenuItemCheckbox>Word wrap</MenuItemCheckbox>
        <MenuSeparator />
        <MenuGroup label="Sort by">
          <MenuItemRadio name="sort" defaultChecked>
            Date
          </MenuItemRadio>
          <MenuItemRadio name="sort">Name</MenuItemRadio>
          <MenuItemRadio name="sort">Size</MenuItemRadio>
        </MenuGroup>
        {extra}
      </MenuContent>
    </Menu>
    <button type="button">After</button>
  </>
);

const active = () => document.activeElement as HTMLElement;
const check = (name: string) =>
  screen.getByRole('menuitemcheckbox', { name }) as HTMLInputElement;
const choice = (name: string) =>
  screen.getByRole('menuitemradio', { name }) as HTMLInputElement;

const open = async () => {
  await browser.click(screen.getByRole('button', { name: 'View' }));
  const surface = screen.getByRole('menu');
  await waitFor(() => expect(surface.matches(':popover-open')).toBe(true));
  await Promise.all(surface.getAnimations().map((a) => a.finished));
  return surface;
};

describe('a menu with commands that carry a state', () => {
  it('draws them with the platform, not with a glyph of ours', async () => {
    render(view());
    await open();

    // A REAL control wearing the menu role, which "ARIA in HTML" allows on
    // exactly these two inputs. It is the whole reason to do it this way: the
    // browser goes on painting the box, the tick, the disabled shading and the
    // High Contrast treatment, so a tick in a menu is the same tick as in a
    // form — by construction rather than by imitation.
    expect(check('Show sidebar').tagName).toBe('INPUT');
    expect(check('Show sidebar').type).toBe('checkbox');
    expect(getComputedStyle(check('Show sidebar')).appearance).toBe('auto');
    expect(choice('Date').tagName).toBe('INPUT');
    expect(choice('Date').type).toBe('radio');
  });

  it('says what it currently IS, which is what a reader needs first', async () => {
    render(view());
    await open();

    // The state comes from the native property; nothing of ours mirrors it.
    expect(check('Show sidebar').checked).toBe(true);
    expect(check('Word wrap').checked).toBe(false);
    expect(
      screen.getByRole('menuitemcheckbox', {
        name: 'Show sidebar',
        checked: true,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitemradio', { name: 'Date', checked: true }),
    ).toBeInTheDocument();
  });

  it('is walked and reached like every other command', async () => {
    render(view());
    await open();
    await waitFor(() => expect(active()).toBe(screen.getByRole('menuitem')));

    await browser.keyboard('{ArrowDown}');
    expect(active()).toBe(check('Show sidebar'));
    await browser.keyboard('{ArrowDown}');
    expect(active()).toBe(check('Word wrap'));
    await browser.keyboard('{ArrowDown}');
    expect(active()).toBe(choice('Date'));

    // TYPING, which is the one that could not work by accident: a form control
    // has no text of its own, so the name has to be read from the label that
    // wraps it — the same string the accessibility tree announces.
    await browser.keyboard('word');
    expect(active()).toBe(check('Word wrap'));
  });

  it('is still one tab stop', async () => {
    render(view());
    await open();
    await waitFor(() => expect(active()).toBe(screen.getByRole('menuitem')));

    // Native inputs are tabbable by default, so this is exactly where a menu
    // full of them would quietly stop being one tab stop.
    for (const row of [
      check('Show sidebar'),
      check('Word wrap'),
      choice('Date'),
      choice('Name'),
      choice('Size'),
    ]) {
      expect(row).toHaveAttribute('tabindex', '-1');
    }
  });

  it('toggles when chosen, and lets the menu be kept open', async () => {
    render(view());
    const surface = await open();
    // HELD before the click: choosing closes the menu, and a closed menu is out
    // of the accessibility tree — the query would fail for the right reason and
    // tell us nothing about the toggle.
    const row = check('Word wrap');

    await browser.click(row);
    expect(row.checked).toBe(true);
    // The APG's default: a command chosen closes the menu it was chosen from.
    await waitFor(() => expect(surface.matches(':popover-open')).toBe(false));
  });

  it('keeps the menu open for a second toggle when asked', async () => {
    render(
      view(<MenuItemCheckbox closeOnSelect={false}>Minimap</MenuItemCheckbox>),
    );
    const surface = await open();
    const row = screen.getByRole('menuitemcheckbox', {
      name: 'Minimap',
    }) as HTMLInputElement;

    await browser.click(row);
    // BOTH, which is the point of the prop: `event.preventDefault()` would have
    // kept the menu open and cancelled the tick, because on a real `<input>`
    // that is what preventing the default means.
    expect(surface.matches(':popover-open')).toBe(true);
    expect(row.checked).toBe(true);

    await browser.click(row);
    expect(row.checked).toBe(false);
    expect(surface.matches(':popover-open')).toBe(true);
  });

  it('cancels the tick when the default is prevented, and says so', async () => {
    const onClick = vi.fn((event: React.MouseEvent) => event.preventDefault());
    render(
      view(
        <MenuItemCheckbox onClick={onClick} closeOnSelect={false}>
          Minimap
        </MenuItemCheckbox>,
      ),
    );
    await open();
    const row = screen.getByRole('menuitemcheckbox', {
      name: 'Minimap',
    }) as HTMLInputElement;

    await browser.click(row);
    expect(onClick).toHaveBeenCalled();
    // The PLATFORM's activation behaviour, cancelled — which is exactly why
    // "keep the menu open" needed a switch of its own rather than borrowing
    // this one.
    expect(row.checked).toBe(false);
  });

  it('is focusable and inert when disabled, never unreachable', async () => {
    render(
      <Menu>
        <MenuTrigger>View</MenuTrigger>
        <MenuContent>
          <MenuItemCheckbox disabled>Minimap</MenuItemCheckbox>
        </MenuContent>
      </Menu>,
    );
    await open();
    const row = screen.getByRole('menuitemcheckbox', {
      name: 'Minimap',
    }) as HTMLInputElement;

    // "Focusable but cannot be activated" (APG) — the native `disabled` would
    // take it out of the arrows' walk, and a command a screen reader in focus
    // mode never lands on is one its user is never told about.
    expect(row).toHaveAttribute('aria-disabled', 'true');
    expect(row).not.toBeDisabled();
    row.focus();
    expect(active()).toBe(row);

    // A programmatic click, for the reason `menu.test.tsx` records: the harness
    // refuses to drive a real pointer at an `aria-disabled` element, while a
    // browser does no such thing — a user can click it, so the guard has to
    // hold against a real click and this is the only way to send one.
    row.click();
    expect(row.checked).toBe(false);
  });

  it('lets the browser keep the one invariant of a set', async () => {
    render(view());
    await open();

    const [date, name, size] = [choice('Date'), choice('Name'), choice('Size')];
    expect(date.checked).toBe(true);
    await browser.click(name);
    // Grouped by `name`, so the browser unchecks the other two. Nothing of ours
    // could enforce it as well, and a set where two rows read "selected" is
    // what this avoids.
    expect(name.checked).toBe(true);
    expect(date.checked).toBe(false);
    expect(size.checked).toBe(false);
  });

  it('names the set, which is what makes "1 of 3" sayable', async () => {
    render(view());
    await open();

    const group = screen.getByRole('group', { name: 'Sort by' });
    expect(group).toBeInTheDocument();
    // The choices are INSIDE it, and still reachable: the arrows walk the
    // surface rather than counting its children.
    expect(group).toContainElement(choice('Date'));
    choice('Date').focus();
    await browser.keyboard('{ArrowDown}');
    expect(active()).toBe(choice('Name'));
  });

  it('draws a line the keyboard walks straight over', async () => {
    render(view());
    await open();

    const separators = screen.getAllByRole('separator');
    expect(separators).toHaveLength(2);
    expect(separators[0].tagName).toBe('HR');
    // Not a command: `End` goes to the last one, and no arrow ever lands here.
    await browser.keyboard('{End}');
    expect(active()).toBe(choice('Size'));
    expect(separators[0]).not.toHaveAttribute('tabindex');
  });

  it('lights the whole row, wherever the focus actually sits', async () => {
    render(view());
    await open();
    const plain = screen.getByRole('menuitem', { name: 'Reload' });
    await waitFor(() => expect(active()).toBe(plain));
    const lit = getComputedStyle(plain).backgroundColor;

    // THE ROW IS A `<label>` here and the focus is on the `<input>` inside it,
    // so a stylesheet reading `:focus` would light the button rows and leave
    // these dark — a difference no keyboard test can see, because focus and
    // roles would all be correct. `:focus-within` is what covers both, and on a
    // button row the two match identically.
    const row = check('Show sidebar');
    row.focus();
    expect(active()).toBe(row);
    const label = row.closest('label') as HTMLElement;
    expect(getComputedStyle(label).backgroundColor).toBe(lit);
    expect(getComputedStyle(label).backgroundColor).not.toBe(
      'rgba(0, 0, 0, 0)',
    );
  });

  describe('accessibility (axe)', () => {
    it('has no violations with every kind of row open', async () => {
      const { container } = renderUi(<main>{view()}</main>);
      await open();
      await expectNoA11yViolations(container);
    });
  });
});

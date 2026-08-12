import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { Menubar } from './menubar.component.js';
import { Menu } from '../menu/menu.component.js';
import { MenuContent } from '../menu-content/menu-content.component.js';
import { MenuItem } from '../menu-item/menu-item.component.js';
import { MenuItemCheckbox } from '../menu-item-checkbox/menu-item-checkbox.component.js';
import { MenuItemTrigger } from '../menu-item-trigger/menu-item-trigger.component.js';
import { MenuTrigger } from '../menu-trigger/menu-trigger.component.js';
import { renderUi } from '../../test/render.js';
import { UiProvider } from '../../i18n/provider.js';
import { expectNoA11yViolations } from '../../test/axe.js';

const bar = (orientation?: 'horizontal' | 'vertical') => (
  <>
    <button type="button">Before</button>
    <Menubar label="Editor" orientation={orientation}>
      <Menu>
        <MenuItemTrigger>File</MenuItemTrigger>
        <MenuContent>
          <MenuItem>New</MenuItem>
          <Menu>
            <MenuItemTrigger>Open recent</MenuItemTrigger>
            <MenuContent>
              <MenuItem>report.pdf</MenuItem>
            </MenuContent>
          </Menu>
          <MenuItem>Save</MenuItem>
        </MenuContent>
      </Menu>
      <Menu>
        <MenuItemTrigger>Edit</MenuItemTrigger>
        <MenuContent>
          <MenuItem>Undo</MenuItem>
          <MenuItem>Copy link</MenuItem>
        </MenuContent>
      </Menu>
      <Menu>
        <MenuItemTrigger>View</MenuItemTrigger>
        <MenuContent>
          <MenuItem>Zoom in</MenuItem>
          <MenuItem>Zoom out</MenuItem>
        </MenuContent>
      </Menu>
    </Menubar>
    <button type="button">After</button>
  </>
);

const command = (name: string) => screen.getByRole('menuitem', { name });
const active = () => document.activeElement as HTMLElement;
const box = (name: string) => command(name).getBoundingClientRect();

const surfaceOf = (name: string) =>
  document.getElementById(
    command(name).getAttribute('popovertarget') as string,
  ) as HTMLElement;

const openedBy = async (name: string) => {
  await waitFor(() =>
    expect(command(name)).toHaveAttribute('aria-expanded', 'true'),
  );
  // SETTLED, not merely open: the surface fades in, and axe reads a
  // mid-transition opacity as a contrast failure on every row. A sibling suite
  // records three defects that reached a commit through exactly this gap.
  await Promise.all(
    surfaceOf(name)
      .getAnimations()
      .map((a) => a.finished),
  );
};
const closedBy = (name: string) =>
  waitFor(() =>
    expect(command(name)).toHaveAttribute('aria-expanded', 'false'),
  );

/** Whether the component took the key, asked where the browser would ask. */
async function prevented(key: string) {
  let seen: boolean | null = null;
  const spy = (event: KeyboardEvent) => {
    seen = event.defaultPrevented;
  };
  window.addEventListener('keydown', spy);
  await browser.keyboard(key);
  window.removeEventListener('keydown', spy);
  return seen;
}

describe('Menubar', () => {
  it('is a named bar of commands, each saying what it opens', () => {
    render(bar());
    const menubar = screen.getByRole('menubar', { name: 'Editor' });
    // Horizontal is what the role already means; only the other one is said.
    expect(menubar).not.toHaveAttribute('aria-orientation');

    for (const name of ['File', 'Edit', 'View']) {
      expect(command(name)).toHaveAttribute('aria-haspopup', 'menu');
      expect(command(name)).toHaveAttribute('aria-expanded', 'false');
    }
  });

  it('is a BAR, which is a claim about the screen', async () => {
    render(bar());
    // The commands share a line and follow one another along it. Asserted
    // because it was not: `MenuItemTrigger` borrows the menu row's `w-full`,
    // and on a wrapping flex line that gave three stacked rows — a bar
    // announced as horizontal, walked with the inline arrows, drawn as a
    // column, with every keyboard test passing.
    expect(box('Edit').top).toBe(box('File').top);
    expect(box('View').top).toBe(box('File').top);
    expect(box('Edit').left).toBeGreaterThan(box('File').right - 1);
    expect(box('File').width).toBeLessThan(
      screen.getByRole('menubar').getBoundingClientRect().width / 2,
    );
  });

  it('stands on its end when told to', async () => {
    render(bar('vertical'));
    expect(screen.getByRole('menubar')).toHaveAttribute(
      'aria-orientation',
      'vertical',
    );
    // …and the layout follows the attribute the stylesheet reads.
    expect(box('Edit').top).toBeGreaterThan(box('File').bottom - 1);
    expect(box('Edit').left).toBe(box('File').left);
  });

  it('puts the tab stop on the first command, and keeps it reachable', async () => {
    const { rerender } = render(bar());
    // "Each item has tabindex -1, EXCEPT IN A MENUBAR, where the first item has
    // tabindex 0" (APG). On the command, not on the bar: a focusable container
    // costs a screen reader user a second announcement for one Tab.
    expect(command('File')).toHaveAttribute('tabindex', '0');
    expect(command('Edit')).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('menubar')).toHaveAttribute('tabindex', '-1');

    screen.getByRole('button', { name: 'Before' }).focus();
    await browser.keyboard('{Tab}');
    expect(active()).toBe(command('File'));

    await browser.keyboard('{ArrowRight}');
    expect(active()).toBe(command('Edit'));

    // Out: Tab LEAVES, which is the difference from a navigation. It does not
    // walk the three commands.
    await browser.keyboard('{Tab}');
    expect(active()).toBe(screen.getByRole('button', { name: 'After' }));

    // And back in lands where the reader was, not at the start again.
    screen.getByRole('button', { name: 'Before' }).focus();
    await browser.keyboard('{Tab}');
    expect(active()).toBe(command('Edit'));

    // THE COMMAND HOLDING IT GOES AWAY. Nothing would carry the `0`, and
    // measured, the whole bar dropped out of the tab order.
    rerender(
      <>
        <button type="button">Before</button>
        <Menubar label="Editor">
          <Menu>
            <MenuItemTrigger>File</MenuItemTrigger>
            <MenuContent>
              <MenuItem>New</MenuItem>
            </MenuContent>
          </Menu>
        </Menubar>
        <button type="button">After</button>
      </>,
    );
    screen.getByRole('button', { name: 'Before' }).focus();
    await browser.keyboard('{Tab}');
    expect(screen.getByRole('menubar').contains(active())).toBe(true);
  });

  it('is still a tab stop with nothing on it, and a visible one', async () => {
    render(
      <>
        <button type="button">Before</button>
        <Menubar label="Tools">{null}</Menubar>
        <button type="button">After</button>
      </>,
    );
    screen.getByRole('button', { name: 'Before' }).focus();
    await browser.keyboard('{Tab}');

    // A bar whose commands are gated by a permission, still loading, or hidden
    // at a breakpoint has nothing to hand the focus to — so it keeps it, and
    // must not do that invisibly.
    const menubar = screen.getByRole('menubar');
    expect(active()).toBe(menubar);
    expect(getComputedStyle(menubar).outlineStyle).not.toBe('none');
    expect(parseFloat(getComputedStyle(menubar).outlineWidth)).toBeGreaterThan(
      0,
    );
  });

  it('walks the bar with the inline arrows, and wraps', async () => {
    render(bar());
    command('File').focus();

    await browser.keyboard('{ArrowRight}');
    expect(active()).toBe(command('Edit'));
    await browser.keyboard('{ArrowRight}');
    expect(active()).toBe(command('View'));
    // A bar is a ring: nobody holding the arrow hits a wall.
    await browser.keyboard('{ArrowRight}');
    expect(active()).toBe(command('File'));
    await browser.keyboard('{ArrowLeft}');
    expect(active()).toBe(command('View'));

    await browser.keyboard('{Home}');
    expect(active()).toBe(command('File'));
    await browser.keyboard('{End}');
    expect(active()).toBe(command('View'));
  });

  it('takes the keys it acts on', async () => {
    render(bar('vertical'));
    command('File').focus();
    // On a vertical bar these are the bar's own keys, and a key it has taken
    // must not also scroll the page under it.
    expect(await prevented('{ArrowDown}')).toBe(true);
    expect(await prevented('{Home}')).toBe(true);
    expect(await prevented('e')).toBe(true);
  });

  it('opens a menu below the command, at either end', async () => {
    render(bar());
    command('File').focus();

    // Down at the first command, Up at the LAST — the only way to reach the end
    // of a long menu in one key.
    await browser.keyboard('{ArrowDown}');
    await openedBy('File');
    await waitFor(() => expect(active()).toBe(command('New')));
    // BELOW it, which is what makes Down the key that opens it.
    expect(surfaceOf('File').getBoundingClientRect().top).toBeGreaterThan(
      box('File').bottom - 1,
    );

    await browser.keyboard('{Escape}');
    await closedBy('File');
    // Closed and the focus returned to the command that opened it (APG),
    // which the platform does for a top-level popover.
    expect(active()).toBe(command('File'));

    await browser.keyboard('{ArrowUp}');
    await openedBy('File');
    await waitFor(() => expect(active()).toBe(command('Save')));
  });

  it('opens with Enter and with Space', async () => {
    render(bar());
    command('File').focus();
    await browser.keyboard('{Enter}');
    await openedBy('File');

    await browser.keyboard('{Escape}');
    await closedBy('File');
    // Space reaches the button only because typing hands it back when it
    // matches nothing — no command here begins with one.
    await browser.keyboard(' ');
    await openedBy('File');
  });

  it('carries an open menu along the bar, both ways', async () => {
    render(bar());
    command('File').focus();
    await browser.keyboard('{ArrowDown}');
    await openedBy('File');

    // The reader is browsing an application menu, not opening one at a time.
    // The one left behind goes without being told: an auto popover closes when
    // another opens.
    await browser.keyboard('{ArrowRight}');
    await openedBy('Edit');
    await closedBy('File');
    await waitFor(() => expect(active()).toBe(command('Undo')));

    // …and backwards, from inside the menu that is now open, which is the same
    // key a submenu uses to go back and must not be confused with it.
    await browser.keyboard('{ArrowLeft}');
    await openedBy('File');
    await closedBy('Edit');
    await waitFor(() => expect(active()).toBe(command('New')));
  });

  it('leaves the arrows alone when the menu can use them', async () => {
    render(bar('vertical'));
    command('File').focus();
    // A VERTICAL bar, where Down is the bar's own key — on a horizontal one
    // this claim has no teeth, because Down was never the bar's.
    await browser.keyboard('{ArrowRight}');
    await openedBy('File');
    await waitFor(() => expect(active()).toBe(command('New')));

    await browser.keyboard('{ArrowDown}');
    expect(active()).toBe(command('Open recent'));
    expect(command('File')).toHaveAttribute('aria-expanded', 'true');
    expect(command('Edit')).toHaveAttribute('tabindex', '-1');
  });

  it('opens a submenu beside its command, and comes back to it', async () => {
    render(bar());
    command('File').focus();
    // One key at a time: the menu opens on a `toggle` the platform fires
    // asynchronously, and the focus reaches its first command with it — two
    // keystrokes sent together arrive while the trigger still has the focus.
    await browser.keyboard('{ArrowDown}');
    await openedBy('File');
    await waitFor(() => expect(active()).toBe(command('New')));
    await browser.keyboard('{ArrowDown}');
    expect(active()).toBe(command('Open recent'));

    // A submenu is BESIDE the command that opens it, so it is the inline arrow
    // that opens it — where the bar's own menu was opened from below.
    await browser.keyboard('{ArrowRight}');
    await openedBy('Open recent');
    await waitFor(() => expect(active()).toBe(command('report.pdf')));

    // And back is one level, to the command that led here — NOT along the bar,
    // which is what the same key does one level up.
    await browser.keyboard('{ArrowLeft}');
    await closedBy('Open recent');
    expect(active()).toBe(command('Open recent'));
    expect(command('File')).toHaveAttribute('aria-expanded', 'true');
  });

  it('leaves the whole stack when Tab is pressed inside a menu', async () => {
    render(bar());
    command('File').focus();
    await browser.keyboard('{ArrowDown}');
    await openedBy('File');
    await waitFor(() => expect(active()).toBe(command('New')));

    // TAB LEAVES, from however deep. This is also the one key that tells a
    // menu of the BAR apart from a submenu: a submenu hands the focus back to
    // the command that opened it, and a menu of a bar has nothing to hand it
    // back to — it is a top-level surface, and the reader asked to go.
    await browser.keyboard('{Tab}');
    await waitFor(() =>
      expect(active()).toBe(screen.getByRole('button', { name: 'After' })),
    );
    expect(command('File')).toHaveAttribute('aria-expanded', 'false');
  });

  it('is reached by typing, on the bar as much as in a menu', async () => {
    render(bar());
    command('File').focus();

    await browser.keyboard('v');
    expect(active()).toBe(command('View'));

    // …and the same buffer inside the menu it opens, where a space is part of
    // the search while the search still finds something.
    await browser.keyboard('{ArrowDown}');
    await openedBy('View');
    await browser.keyboard('zoom o');
    await waitFor(() => expect(active()).toBe(command('Zoom out')));
  });

  it('walks the commands that share a letter when the letter is repeated', async () => {
    render(
      <Menubar label="Editor">
        <Menu>
          <MenuItemTrigger>File</MenuItemTrigger>
          <MenuContent>
            <MenuItem>New</MenuItem>
          </MenuContent>
        </Menu>
        <Menu>
          <MenuItemTrigger>Format</MenuItemTrigger>
          <MenuContent>
            <MenuItem>Bold</MenuItem>
          </MenuContent>
        </Menu>
        <Menu>
          <MenuItemTrigger>Find</MenuItemTrigger>
          <MenuContent>
            <MenuItem>In files</MenuItem>
          </MenuContent>
        </Menu>
      </Menubar>,
    );
    command('File').focus();
    // A single letter searches from where you ARE, not from the top — otherwise
    // pressing it again answers with the same command for ever.
    await browser.keyboard('f');
    expect(active()).toBe(command('Format'));
    await browser.keyboard('f');
    expect(active()).toBe(command('Find'));
    await browser.keyboard('f');
    expect(active()).toBe(command('File'));
  });

  it('leaves a field inside one of its menus alone', async () => {
    render(
      <Menubar label="Editor">
        <Menu>
          <MenuItemTrigger>Find</MenuItemTrigger>
          <MenuContent>
            <input aria-label="Search for" defaultValue="abc" />
            <MenuItem>In files</MenuItem>
          </MenuContent>
        </Menu>
        <Menu>
          <MenuItemTrigger>Edit</MenuItemTrigger>
          <MenuContent>
            <MenuItem>Undo</MenuItem>
          </MenuContent>
        </Menu>
      </Menubar>,
    );
    command('Find').focus();
    await browser.keyboard('{ArrowDown}');
    await openedBy('Find');

    const field = screen.getByRole('textbox', { name: 'Search for' });
    field.focus();
    await browser.keyboard('{ArrowLeft}');
    // The arrows in a field belong to the CARET, and the menu hands these keys
    // to the bar on purpose — so the bar has to ask the same question the menu
    // asks. Measured without it: the caret did not move, the menu closed, and
    // the next one opened.
    expect(active()).toBe(field);
    expect(command('Find')).toHaveAttribute('aria-expanded', 'true');
    expect(command('Edit')).toHaveAttribute('aria-expanded', 'false');

    // …and so does its text.
    await browser.keyboard('edit');
    expect((field as HTMLInputElement).value).not.toBe('abc');
    expect(active()).toBe(field);
  });

  it('takes a command that opens nothing', async () => {
    render(
      <Menubar label="Editor">
        <Menu>
          <MenuItemTrigger>File</MenuItemTrigger>
          <MenuContent>
            <MenuItem>New</MenuItem>
          </MenuContent>
        </Menu>
        <MenuItem>Help</MenuItem>
      </Menubar>,
    );
    // The APG's other kind of bar command — Help, About — which activates
    // rather than opening. It belongs to the FAMILY, and a bar is one: reading
    // the menu context alone left it registered with nobody, `tabindex="-1"`
    // for ever, and announced as a command of a bar that could never reach it.
    command('File').focus();
    await browser.keyboard('{ArrowRight}');
    expect(active()).toBe(command('Help'));
    await browser.keyboard('h');
    expect(active()).toBe(command('Help'));
  });

  it('closes the menu it walks away from, even onto a command with none', async () => {
    render(
      <Menubar label="Editor">
        <Menu>
          <MenuItemTrigger>File</MenuItemTrigger>
          <MenuContent>
            <MenuItem>New</MenuItem>
          </MenuContent>
        </Menu>
        <MenuItem>Help</MenuItem>
      </Menubar>,
    );
    command('File').focus();
    await browser.keyboard('{ArrowDown}');
    await openedBy('File');

    // Nothing opens to close it — an auto popover only steps aside for another
    // one — so a menu left standing over the page with the focus on the bar is
    // what happens when nobody says otherwise.
    await browser.keyboard('{ArrowRight}');
    expect(active()).toBe(command('Help'));
    await closedBy('File');
  });

  it('carries the menu under the pointer too', async () => {
    render(bar());
    command('File').focus();
    await browser.keyboard('{ArrowDown}');
    await openedBy('File');

    // THE POINTER ARRIVES BY MOVING, and the fixture has to as well: a hover
    // with no travel behind it is indistinguishable from a surface opening
    // under a cursor that never moved, which is the thing the bar now refuses.
    // A real pointer cannot reach a menu without crossing the page first — this
    // line is that crossing.
    await browser.hover(command('File'));

    // Sweeping the pointer along an open application menu is how one is read.
    // Focusing without carrying left the menu the reader had walked away from
    // standing over the page, with the tab stop somewhere else entirely.
    await browser.hover(command('Edit'));
    await openedBy('Edit');
    await closedBy('File');
  });

  it('opens nothing under a pointer that arrives on a closed bar', async () => {
    render(bar());
    await browser.hover(command('Edit'));
    // Hover-to-open is not this: a bar nobody has opened yet does not go off
    // under a pointer crossing it on its way somewhere else.
    expect(command('Edit')).toHaveAttribute('aria-expanded', 'false');
  });

  it('lets a consumer name it their own way', () => {
    render(
      <>
        <h2 id="tools">Tools</h2>
        <Menubar label="Editor" aria-label="Tools">
          <Menu>
            <MenuItemTrigger>File</MenuItemTrigger>
            <MenuContent>
              <MenuItem>New</MenuItem>
            </MenuContent>
          </Menu>
        </Menubar>
      </>,
    );
    // `label` is before the spread on purpose: a name the consumer supplies
    // themselves wins. Asserted with `aria-label` and NOT `aria-labelledby`,
    // which outranks both and so cannot tell the two orderings apart — the
    // first version of this test could not fail.
    expect(screen.getByRole('menubar')).toHaveAccessibleName('Tools');
  });

  it('keeps two bars on a page apart', async () => {
    render(
      <>
        <Menubar label="Document">
          <Menu>
            <MenuItemTrigger>File</MenuItemTrigger>
            <MenuContent>
              <MenuItem>New</MenuItem>
            </MenuContent>
          </Menu>
        </Menubar>
        <Menubar label="Tools">
          <Menu>
            <MenuItemTrigger>Build</MenuItemTrigger>
            <MenuContent>
              <MenuItem>Run</MenuItem>
            </MenuContent>
          </Menu>
        </Menubar>
      </>,
    );
    // Which is the reason `label` is required, and each keeps its own tab stop
    // and its own family.
    expect(
      screen.getByRole('menubar', { name: 'Document' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('menubar', { name: 'Tools' })).toBeInTheDocument();
    expect(command('File')).toHaveAttribute('tabindex', '0');
    expect(command('Build')).toHaveAttribute('tabindex', '0');

    command('File').focus();
    await browser.keyboard('{ArrowRight}');
    // The arrows do not walk out of one bar into the other.
    expect(active()).toBe(command('File'));
  });

  it('says so when the trigger cannot join the bar', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(
      <Menubar label="Editor">
        <Menu>
          <MenuTrigger>File</MenuTrigger>
          <MenuContent>
            <MenuItem>New</MenuItem>
          </MenuContent>
        </Menu>
      </Menubar>,
    );

    // The wrong trigger WORKS, which is why it needs saying: it opens its menu
    // perfectly well while never joining the family, so the arrows and typing
    // cannot reach it and it is a second tab stop in something whose whole
    // contract is having one. Nothing about it looks broken.
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('must be a `MenuItemTrigger`'),
    );
    warn.mockRestore();
  });

  it('says nothing when the trigger is the right one', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(bar());
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('walks the other way in Arabic', async () => {
    render(
      <UiProvider adapters={{ i18n: { locale: 'ar' } }}>{bar()}</UiProvider>,
    );
    command('File').focus();

    // The bar runs the way the text does: the key that moves forward is the one
    // that points to where the next command IS.
    await browser.keyboard('{ArrowLeft}');
    expect(active()).toBe(command('Edit'));
    await browser.keyboard('{ArrowRight}');
    expect(active()).toBe(command('File'));
  });

  describe('accessibility (axe)', () => {
    it('has no violations with a menu open', async () => {
      const { container } = renderUi(<main>{bar()}</main>);
      await browser.click(command('File'));
      await openedBy('File');
      await expectNoA11yViolations(container);
    });

    it('has no violations standing on its end', async () => {
      const { container } = renderUi(<main>{bar('vertical')}</main>);
      await browser.click(command('File'));
      await openedBy('File');
      await expectNoA11yViolations(container);
    });
  });
});

/** A bar whose commands come and go, for the tab-stop lifecycle. */
function Gated() {
  const [show, setShow] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setShow(false)}>
        Hide
      </button>
      <Menubar label="Editor">
        {show && (
          <Menu>
            <MenuItemTrigger>File</MenuItemTrigger>
            <MenuContent>
              <MenuItem>New</MenuItem>
            </MenuContent>
          </Menu>
        )}
        <Menu>
          <MenuItemTrigger>Edit</MenuItemTrigger>
          <MenuContent>
            <MenuItem>Undo</MenuItem>
          </MenuContent>
        </Menu>
      </Menubar>
    </>
  );
}

describe('Menubar, when its commands come and go', () => {
  it('does not leave the tab stop on a command that has left', async () => {
    render(<Gated />);
    expect(command('File')).toHaveAttribute('tabindex', '0');

    await browser.click(screen.getByRole('button', { name: 'Hide' }));
    await waitFor(() =>
      expect(screen.queryByRole('menuitem', { name: 'File' })).toBeNull(),
    );

    // The id it held pointed at nothing, so nothing carried the `0` — measured,
    // the entire bar dropped out of the tab order and `Tab` stepped over it.
    screen.getByRole('button', { name: 'Hide' }).focus();
    await browser.keyboard('{Tab}');
    expect(screen.getByRole('menubar').contains(active())).toBe(true);
  });

  it('does not strand the bar when a DIRECT command leaves either', async () => {
    // The cleanup above lived in MenuItemTrigger alone; the three row types
    // this hook serves — including a plain MenuItem straight on the bar, a
    // first-class composition — had none. Reader on Help, a permission
    // unmounts it, activeId points at nothing: the bar held tabIndex={-1} and
    // left the page's tab order, silently.
    function GatedDirect() {
      const [show, setShow] = useState(true);
      return (
        <>
          <button type="button" onClick={() => setShow(false)}>
            Hide
          </button>
          <Menubar label="Editor">
            <Menu>
              <MenuItemTrigger>File</MenuItemTrigger>
              <MenuContent>
                <MenuItem>New</MenuItem>
              </MenuContent>
            </Menu>
            {show && <MenuItem>Help</MenuItem>}
          </Menubar>
        </>
      );
    }
    render(<GatedDirect />);
    command('Help').focus();
    await browser.click(screen.getByRole('button', { name: 'Hide' }));
    await waitFor(() =>
      expect(screen.queryByRole('menuitem', { name: 'Help' })).toBeNull(),
    );
    screen.getByRole('button', { name: 'Hide' }).focus();
    await browser.keyboard('{Tab}');
    expect(screen.getByRole('menubar').contains(active())).toBe(true);
  });

  it('walks the bar from a CHECKABLE row too', async () => {
    // menuitemcheckbox/radio are not `menuitem` to an exact attribute match:
    // from "Show sidebar" the ArrowRight bubbled to the bar and the guard
    // refused the walk — while the mdx promises "walking on from there still
    // works". The canonical menubar content is exactly a View menu of
    // checkable rows. Written in the house pattern: keyboard-open, then the
    // walk lands INSIDE the next menu.
    render(
      <Menubar label="Editor">
        <Menu>
          <MenuItemTrigger>View</MenuItemTrigger>
          <MenuContent>
            <MenuItemCheckbox defaultChecked={false}>
              Show sidebar
            </MenuItemCheckbox>
          </MenuContent>
        </Menu>
        <Menu>
          <MenuItemTrigger>Help</MenuItemTrigger>
          <MenuContent>
            <MenuItem>About</MenuItem>
          </MenuContent>
        </Menu>
      </Menubar>,
    );
    command('View').focus();
    await browser.keyboard('{ArrowDown}');
    const row = await screen.findByRole('menuitemcheckbox', {
      name: 'Show sidebar',
    });
    await waitFor(() => expect(active()).toBe(row));

    await browser.keyboard('{ArrowRight}');
    await waitFor(() =>
      expect(command('Help')).toHaveAttribute('aria-expanded', 'true'),
    );
    await waitFor(() =>
      expect(active()).toBe(screen.getByRole('menuitem', { name: 'About' })),
    );
  });
});

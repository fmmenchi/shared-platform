import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from '@vitest/browser/context';
import { Menu } from './menu.component.js';
import { MenuTrigger } from '../menu-trigger/menu-trigger.component.js';
import { MenuContent } from '../menu-content/menu-content.component.js';
import { MenuItem } from '../menu-item/menu-item.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

const example = (
  props: {
    onRename?: () => void;
    onOpenChange?: (open: boolean) => void;
  } = {},
) => (
  <Menu onOpenChange={props.onOpenChange}>
    <MenuTrigger>Actions</MenuTrigger>
    <MenuContent>
      <MenuItem onClick={props.onRename}>Rename</MenuItem>
      <MenuItem disabled>Duplicate</MenuItem>
      <MenuItem>Delete</MenuItem>
    </MenuContent>
  </Menu>
);

const item = (name: string) => screen.getByRole('menuitem', { name });
const open = () =>
  browser.click(screen.getByRole('button', { name: 'Actions' }));

describe('Menu', () => {
  it('adds no element of its own', () => {
    const { container } = render(example());
    expect(container.firstElementChild?.tagName).toBe('BUTTON');
  });

  it('announces itself the way a menu button does', async () => {
    render(example());
    const trigger = screen.getByRole('button', { name: 'Actions' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await open();
    // `waitFor` on both, and for different reasons. "expanded" is not written
    // by the click: the platform opens the popover, `toggle` tells us, and
    // React renders after that. And the surface FADES IN — measured, this
    // failed two runs in six because `toBeVisible` was reading `opacity: 0`
    // three frames into the entry transition, which is a picture of the menu
    // opening rather than of anything being wrong.
    await waitFor(() =>
      expect(trigger).toHaveAttribute('aria-expanded', 'true'),
    );
    await waitFor(() => expect(screen.getByRole('menu')).toBeVisible());
  });

  it('focuses the first item on open — the platform does not', async () => {
    render(example());
    await open();
    // Measured in all three engines before this existed: `popovertarget` opens
    // the surface and leaves the focus on the trigger, so a keyboard user could
    // not reach the menu at all.
    await waitFor(() => expect(document.activeElement).toBe(item('Rename')));
  });

  it('is ONE tab stop: only the focused item is tabbable', async () => {
    render(example());
    await open();

    await waitFor(() =>
      expect(item('Rename')).toHaveAttribute('tabindex', '0'),
    );
    expect(item('Duplicate')).toHaveAttribute('tabindex', '-1');
    expect(item('Delete')).toHaveAttribute('tabindex', '-1');
  });

  it('moves with the arrows, skips what is disabled, and wraps', async () => {
    render(example());
    await open();
    await waitFor(() => expect(document.activeElement).toBe(item('Rename')));

    // Duplicate is disabled: the arrows step over it, and it stays in the DOM
    // so a screen reader still learns the command exists.
    await browser.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(item('Delete'));

    // A menu is a ring.
    await browser.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(item('Rename'));

    await browser.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(item('Delete'));
  });

  it('goes to the ends with Home and End', async () => {
    render(example());
    await open();
    await waitFor(() => expect(document.activeElement).toBe(item('Rename')));

    await browser.keyboard('{End}');
    expect(document.activeElement).toBe(item('Delete'));

    await browser.keyboard('{Home}');
    expect(document.activeElement).toBe(item('Rename'));
  });

  it('leaves on Tab instead of walking through the items', async () => {
    render(example());
    await open();
    await waitFor(() => expect(document.activeElement).toBe(item('Rename')));

    // What the platform does unaided — measured — is move focus to the next
    // item. A menu is one tab stop: Tab dismisses it.
    await browser.keyboard('{Tab}');
    await waitFor(() =>
      expect(
        screen.getByRole('menu', { hidden: true }).matches(':popover-open'),
      ).toBe(false),
    );
  });

  it('runs the command and closes', async () => {
    const onRename = vi.fn();
    render(example({ onRename }));
    await open();
    await waitFor(() => expect(document.activeElement).toBe(item('Rename')));

    await browser.keyboard('{Enter}');
    expect(onRename).toHaveBeenCalledTimes(1);
    // Staying open would leave the user looking at a list of things they have
    // already done.
    await waitFor(() =>
      expect(
        screen.getByRole('menu', { hidden: true }).matches(':popover-open'),
      ).toBe(false),
    );
  });

  it('closes on Escape, and the focus goes back to the trigger', async () => {
    render(example());
    const trigger = screen.getByRole('button', { name: 'Actions' });
    await open();
    await waitFor(() => expect(document.activeElement).toBe(item('Rename')));

    await browser.keyboard('{Escape}');
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it('lets the pointer hand over to the keyboard', async () => {
    render(example());
    await open();
    await waitFor(() => expect(document.activeElement).toBe(item('Rename')));

    // Hovering makes an item the active one without stealing the focus, so the
    // next arrow continues from where the mouse is (APG).
    await browser.hover(item('Delete'));
    await waitFor(() =>
      expect(item('Delete')).toHaveAttribute('tabindex', '0'),
    );
    expect(item('Rename')).toHaveAttribute('tabindex', '-1');
  });

  it('reports what the platform did', async () => {
    const onOpenChange = vi.fn();
    render(example({ onOpenChange }));

    await open();
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    await browser.keyboard('{Escape}');
    await waitFor(() => expect(onOpenChange).toHaveBeenLastCalledWith(false));
  });

  it('is named by its trigger', async () => {
    render(example());
    await open();
    // Measured before this: the trigger had no id, so `aria-labelledby`
    // resolved to nothing and the menu was announced as "menu". axe does not
    // catch it, which is why the assertion is here.
    expect(screen.getByRole('menu')).toHaveAccessibleName('Actions');
  });

  it('opens from the trigger’s arrows, at the end when asked', async () => {
    render(example());
    const trigger = screen.getByRole('button', { name: 'Actions' });

    trigger.focus();
    await browser.keyboard('{ArrowDown}');
    await waitFor(() => expect(document.activeElement).toBe(item('Rename')));
    await browser.keyboard('{Escape}');

    // ArrowUp opens at the LAST command (APG) — the only way to reach the end
    // of a long menu in one key.
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    await browser.keyboard('{ArrowUp}');
    await waitFor(() => expect(document.activeElement).toBe(item('Delete')));

    // …and the next open starts at the top again.
    await browser.keyboard('{Escape}');
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    await browser.keyboard('{ArrowDown}');
    await waitFor(() => expect(document.activeElement).toBe(item('Rename')));
  });

  it('keeps the keyboard alive when no item can hold the focus', async () => {
    render(
      <Menu>
        <MenuTrigger>Actions</MenuTrigger>
        <MenuContent>
          <MenuItem disabled>Rename</MenuItem>
          <MenuItem disabled>Delete</MenuItem>
        </MenuContent>
      </Menu>,
    );
    await open();

    // Measured before this: the focus stayed on the trigger, so the handler on
    // the surface never heard a key — the menu was open and the keyboard dead,
    // with `Tab` unable to close it either.
    const surface = screen.getByRole('menu');
    await waitFor(() => expect(document.activeElement).toBe(surface));

    await browser.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(surface);

    await browser.keyboard('{Tab}');
    await waitFor(() =>
      expect(
        screen.getByRole('menu', { hidden: true }).matches(':popover-open'),
      ).toBe(false),
    );
  });

  it('takes the focus back when the item holding it disappears', async () => {
    const Vanishing = () => {
      const [withSecond, setWithSecond] = useState(true);
      return (
        <>
          <Menu>
            <MenuTrigger>Actions</MenuTrigger>
            <MenuContent>
              <MenuItem>Rename</MenuItem>
              {withSecond && <MenuItem>Delete</MenuItem>}
            </MenuContent>
          </Menu>
          <button type="button" onClick={() => setWithSecond(false)}>
            drop
          </button>
        </>
      );
    };
    render(<Vanishing />);
    await open();
    await waitFor(() => expect(document.activeElement).toBe(item('Rename')));

    await browser.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(item('Delete'));

    // The item under the focus goes. The browser drops the focus on `<body>`,
    // and with the handler bound to the surface the whole menu went dead.
    screen.getByRole('button', { name: 'drop' }).click();
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('menu')),
    );

    await browser.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(item('Rename'));
  });

  it('lets the pointer hand over to the keyboard, for real', async () => {
    render(example());
    await open();
    await waitFor(() => expect(document.activeElement).toBe(item('Rename')));

    // Measured before this: the arrows read `document.activeElement` while the
    // hover wrote a separate state, so Down after a hover continued from the
    // OLD row. Hovering focuses now, which is one fact instead of two.
    await browser.hover(item('Delete'));
    await waitFor(() => expect(document.activeElement).toBe(item('Delete')));

    await browser.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(item('Rename'));
  });

  it('highlights exactly one row', async () => {
    render(example());
    await open();
    await waitFor(() => expect(document.activeElement).toBe(item('Rename')));

    await browser.hover(item('Delete'));
    // Two rules — `:hover` and `:focus-visible` — lit two rows at once, and lit
    // none at all when the menu was opened with the mouse. One attribute now
    // says which row is the one.
    await waitFor(() =>
      expect(
        screen
          .getAllByRole('menuitem')
          .filter((row) => row.hasAttribute('data-active')),
      ).toHaveLength(1),
    );
    expect(item('Delete')).toHaveAttribute('data-active');
  });

  it('stops saying it is open when the menu is taken away', async () => {
    const Disappearing = () => {
      const [withMenu, setWithMenu] = useState(true);
      return (
        <Menu>
          <MenuTrigger>Actions</MenuTrigger>
          {withMenu && (
            <MenuContent>
              <MenuItem>Rename</MenuItem>
            </MenuContent>
          )}
          <button type="button" onClick={() => setWithMenu(false)}>
            remove
          </button>
        </Menu>
      );
    };
    render(<Disappearing />);
    await open();
    const trigger = screen.getByRole('button', { name: 'Actions' });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    // Nothing will ever fire `toggle` again: without a report on unmount the
    // trigger announced a menu that no longer exists, permanently.
    screen.getByRole('button', { name: 'remove' }).click();
    await waitFor(() =>
      expect(trigger).toHaveAttribute('aria-expanded', 'false'),
    );
  });

  it('walks up to the LAST item from something that is not an item', async () => {
    render(
      <Menu>
        <MenuTrigger>Actions</MenuTrigger>
        <MenuContent>
          <input aria-label="Filter" />
          <MenuItem>Rename</MenuItem>
          <MenuItem>Delete</MenuItem>
        </MenuContent>
      </Menu>,
    );
    await open();

    // `indexOf` returns -1 here, and the first version did arithmetic on that
    // -1: ArrowUp landed on the second-to-last item and skipped the end.
    screen.getByLabelText('Filter').focus();
    await browser.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(item('Delete'));
  });

  it('stays inside the viewport, however long it is', async () => {
    render(
      <div style={{ paddingTop: '45vh' }}>
        <Menu>
          <MenuTrigger>Actions</MenuTrigger>
          <MenuContent>
            {Array.from({ length: 40 }, (_, index) => (
              <MenuItem key={index}>Command {index}</MenuItem>
            ))}
          </MenuContent>
        </Menu>
      </div>,
    );
    await open();

    // Measured before the geometry reported the room: a `100dvh` cap on a box
    // starting 447px down the screen ran 383px past the bottom edge, and the
    // surface is `fixed` in the top layer so no page scroll could reach it.
    const surface = screen.getByRole('menu').getBoundingClientRect();
    expect(surface.bottom).toBeLessThanOrEqual(window.innerHeight);

    await browser.keyboard('{End}');
    const last = (
      document.activeElement as HTMLElement
    ).getBoundingClientRect();
    // …and the command the keyboard lands on is one the user can see.
    expect(last.bottom).toBeLessThanOrEqual(window.innerHeight);
  });

  describe('typeahead', () => {
    /**
     * Three commands sharing a prefix (so a search can refine, and a repeated
     * letter has somewhere to walk to), and a disabled one in the middle of the
     * letter IT shares.
     */
    const commands = (handlers: { onCopy?: () => void } = {}) => (
      <Menu>
        <MenuTrigger>Actions</MenuTrigger>
        <MenuContent>
          <MenuItem onClick={handlers.onCopy}>Copy</MenuItem>
          <MenuItem>Copy link</MenuItem>
          <MenuItem>Curtail</MenuItem>
          <MenuItem>Cut</MenuItem>
          <MenuItem disabled>Delete</MenuItem>
          <MenuItem>Duplicate</MenuItem>
          <MenuItem>Rename</MenuItem>
        </MenuContent>
      </Menu>
    );

    /** Open, and wait for the focus to be somewhere known. */
    const openAtCopy = async () => {
      await open();
      await waitFor(() => expect(document.activeElement).toBe(item('Copy')));
    };

    /** Long enough for the search to be forgotten, and not much longer. */
    const forget = () => new Promise((resolve) => setTimeout(resolve, 1200));

    it('goes to the command you type', async () => {
      render(commands());
      await openAtCopy();

      await browser.keyboard('r');
      expect(document.activeElement).toBe(item('Rename'));
    });

    it('keeps refining while you go on typing', async () => {
      render(commands());
      await openAtCopy();

      // AT A HUMAN PACE. The suite types about sixty times faster than a person
      // — measured, 8ms a key — so keys pressed back to back prove only that
      // the buffer accumulates, never that the window is long enough to be of
      // use: a 60ms window passed the first version of this test.
      await browser.keyboard('c');
      await new Promise((resolve) => setTimeout(resolve, 700));
      await browser.keyboard('u');
      expect(document.activeElement).toBe(item('Curtail'));
    });

    it('gives you the window again on every key, not once a run', async () => {
      render(commands());
      await openAtCopy();

      // Three keys 600ms apart: 1200ms from the first, so a window that starts
      // once and is never restarted has already expired by the third — the
      // menu would then hear a bare "r" and go to Rename.
      await browser.keyboard('c');
      await new Promise((resolve) => setTimeout(resolve, 600));
      await browser.keyboard('u');
      await new Promise((resolve) => setTimeout(resolve, 600));
      await browser.keyboard('r');
      expect(document.activeElement).toBe(item('Curtail'));
    });

    it('walks the commands that share a letter when you repeat it', async () => {
      render(commands());
      await openAtCopy();

      // The APG's "the NEXT item whose label begins with it": one letter always
      // moves on, so the first press leaves the command the focus is on.
      await browser.keyboard('c');
      expect(document.activeElement).toBe(item('Copy link'));
      await browser.keyboard('c');
      expect(document.activeElement).toBe(item('Curtail'));
      await browser.keyboard('c');
      expect(document.activeElement).toBe(item('Cut'));
      // …and round, past the ones that do not share it.
      await browser.keyboard('c');
      expect(document.activeElement).toBe(item('Copy'));
    });

    it('walks them at whatever pace you press the letter', async () => {
      render(commands());
      await openAtCopy();

      // THE DEFECT THIS EXISTS FOR: asking whether the BUFFER was a repeat
      // makes the answer depend on typing speed, because the buffer expires.
      // Measured, pressing "c" with a pause never left the first "c" command.
      await browser.keyboard('c');
      expect(document.activeElement).toBe(item('Copy link'));
      await forget();
      await browser.keyboard('c');
      expect(document.activeElement).toBe(item('Curtail'));
    });

    it('does not read a doubled first letter as a walk', async () => {
      render(
        <Menu>
          <MenuTrigger>Actions</MenuTrigger>
          <MenuContent>
            <MenuItem>Aanmaken</MenuItem>
            <MenuItem>Archiveren</MenuItem>
            <MenuItem>Afdrukken</MenuItem>
          </MenuContent>
        </Menu>,
      );
      await open();
      await waitFor(() =>
        expect(document.activeElement).toBe(item('Aanmaken')),
      );

      // A doubled letter starts ordinary words in Dutch, Spanish and Welsh. The
      // walk is what a search falls BACK to, so "aa" is looked up as itself
      // first and finds Aanmaken; deciding on the shape of the buffer alone
      // threw the user to Afdrukken, mid-word, out loud.
      await browser.keyboard('a');
      expect(document.activeElement).toBe(item('Archiveren'));
      await browser.keyboard('a');
      expect(document.activeElement).toBe(item('Aanmaken'));
    });

    it('steps over a disabled command it would otherwise have matched', async () => {
      render(commands());
      await openAtCopy();

      // Delete comes first and starts with the letter: typeahead must not park
      // the focus on something that cannot take it.
      await browser.keyboard('d');
      expect(document.activeElement).toBe(item('Duplicate'));
    });

    it('leaves the focus alone when nothing matches', async () => {
      render(commands());
      await openAtCopy();

      // From the LAST command, not the first: starting at the top cannot tell
      // "did not move" from "went back to the top", which is the nearest
      // neighbour of the defect this guards — the first version reused the
      // "focus this, or the surface" helper, so a mistyped letter took the
      // focus off the command the user was on and Enter had nothing to run.
      await browser.keyboard('{End}');
      expect(document.activeElement).toBe(item('Rename'));
      await browser.keyboard('z');
      expect(document.activeElement).toBe(item('Rename'));
    });

    it('searches from the top when no command holds the focus', async () => {
      render(commands());
      await openAtCopy();

      // The surface holds the focus whenever no item can — every command
      // disabled, the focused one removed — and typing has to work from there.
      // It is also the one place the guard above could go wrong in the other
      // direction: a key aimed at the surface ITSELF is ours.
      screen.getByRole('menu').focus();
      await browser.keyboard('ren');
      expect(document.activeElement).toBe(item('Rename'));
    });

    it('reads the name a screen reader would say, not the raw text', async () => {
      render(
        <Menu>
          <MenuTrigger>Actions</MenuTrigger>
          <MenuContent>
            <MenuItem>Rename</MenuItem>
            <MenuItem>
              <span aria-hidden="true">🗑</span>Delete
            </MenuItem>
          </MenuContent>
        </Menu>,
      );
      await open();
      await waitFor(() => expect(document.activeElement).toBe(item('Rename')));

      // Decoration is in the TEXT and not in the name: a screen reader goes on
      // announcing this command "Delete", so it has to answer to "d".
      await browser.keyboard('d');
      expect(document.activeElement).toBe(item('Delete'));
    });

    it('answers to the name an icon-only command was given', async () => {
      render(
        <Menu>
          <MenuTrigger>Actions</MenuTrigger>
          <MenuContent>
            <MenuItem>Rename</MenuItem>
            <MenuItem aria-label="Archive">
              <svg aria-hidden="true" width="12" height="12" />
            </MenuItem>
          </MenuContent>
        </Menu>,
      );
      await open();
      await waitFor(() => expect(document.activeElement).toBe(item('Rename')));

      // Its text is empty, so a search that only reads text can never reach it
      // — while the user has just heard it called "Archive".
      await browser.keyboard('a');
      expect(document.activeElement).toBe(item('Archive'));
    });

    it('lets a command declare what to match when its name starts elsewhere', async () => {
      render(
        <Menu>
          <MenuTrigger>Actions</MenuTrigger>
          <MenuContent>
            <MenuItem>Rename</MenuItem>
            <MenuItem textValue="Duplicate">
              <span>New</span> Duplicate
            </MenuItem>
          </MenuContent>
        </Menu>,
      );
      await open();
      await waitFor(() => expect(document.activeElement).toBe(item('Rename')));

      await browser.keyboard('d');
      expect(document.activeElement).toBe(
        screen.getByRole('menuitem', { name: 'New Duplicate' }),
      );
    });

    it('compares the way the reader’s language does', async () => {
      renderUi(
        <Menu>
          <MenuTrigger>Actions</MenuTrigger>
          <MenuContent>
            <MenuItem>Ranger</MenuItem>
            <MenuItem>Élève</MenuItem>
          </MenuContent>
        </Menu>,
        { locale: 'fr' },
      );
      await open();
      await waitFor(() => expect(document.activeElement).toBe(item('Ranger')));

      // Measured: "élève".startsWith("e") is false, so lowercasing left every
      // accented command answering to no keystroke at all — and there is no
      // lowercasing that fixes it, since Turkish maps "I" onto "ı" and then
      // breaks the user who types "i".
      await browser.keyboard('e');
      expect(document.activeElement).toBe(item('Élève'));

      // The same comparison settles case, so a capital reaches it too.
      await forget();
      await browser.keyboard('{Shift>}R{/Shift}');
      expect(document.activeElement).toBe(item('Ranger'));
    });

    it('leaves Space to the command once the search has nothing more', async () => {
      const onCopy = vi.fn();
      render(commands({ onCopy }));
      await openAtCopy();
      item('Rename').focus();

      // Mid-search a space is a space — "Copy link" cannot be reached without
      // one — and it must not fire the command the focus is on.
      await browser.keyboard('copy');
      expect(document.activeElement).toBe(item('Copy'));
      expect(onCopy).not.toHaveBeenCalled();
      await browser.keyboard(' ');
      expect(document.activeElement).toBe(item('Copy link'));
      expect(onCopy).not.toHaveBeenCalled();
    });

    it('runs the command when Space would find nothing', async () => {
      const onCopy = vi.fn();
      render(commands({ onCopy }));
      await openAtCopy();
      item('Rename').focus();

      // A slow typist reaches a command by name and then presses Space to run
      // it. Asking whether a search was merely RUNNING left them with the focus
      // unmoved and the command not run, because "cop " matches nothing.
      await browser.keyboard('cop');
      expect(document.activeElement).toBe(item('Copy'));
      await browser.keyboard(' ');
      expect(onCopy).toHaveBeenCalledTimes(1);
    });

    it('ignores a letter a modifier has turned into a shortcut', async () => {
      render(commands());
      await openAtCopy();

      // Ctrl/Cmd/Alt+letter are the browser's and the platform's: swallowing
      // them would take select-all away from the user inside our menu.
      for (const chord of [
        '{Control>}r{/Control}',
        '{Meta>}r{/Meta}',
        '{Alt>}r{/Alt}',
      ]) {
        await browser.keyboard(chord);
        expect(document.activeElement).toBe(item('Copy'));
      }
    });

    it('lets AltGr through, because it is not a shortcut', async () => {
      render(commands());
      await openAtCopy();

      // The one synthetic event in this file, and it says why: Windows delivers
      // AltGr as Ctrl+Alt, and this harness — a Mac Chromium — cannot be made
      // to produce that. `{AltGraph>}r{/AltGraph}` sets neither modifier, so a
      // test written with it passes whether the guard exists or not; measured,
      // it survived the mutation that treats the pair as a shortcut. So the
      // event is dispatched as Windows sends it. AltGr is how every Polish,
      // Czech and Croatian diacritic is typed, and reading it as a shortcut
      // leaves those letters reaching nothing at all.
      document.activeElement?.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'r',
          ctrlKey: true,
          altKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
      expect(document.activeElement).toBe(item('Rename'));
    });

    it('leaves a field inside the menu its own keys', async () => {
      render(
        <Menu>
          <MenuTrigger>Actions</MenuTrigger>
          <MenuContent>
            <input aria-label="Filter" />
            <MenuItem>Rename</MenuItem>
            <MenuItem>Delete</MenuItem>
          </MenuContent>
        </Menu>,
      );
      await open();
      await waitFor(() => expect(document.activeElement).toBe(item('Rename')));

      // A printable character is TEXT, and text belongs to whatever holds the
      // focus. Measured before this: every character was swallowed and the
      // focus pulled onto a command, so the field could not be typed into at
      // all — and the only way out, `stopPropagation`, is documented nowhere.
      const filter = screen.getByLabelText('Filter') as HTMLInputElement;
      filter.focus();
      await browser.keyboard('re');
      expect(filter.value).toBe('re');
      expect(document.activeElement).toBe(filter);
    });

    it('forgets the search when the menu closes', async () => {
      render(commands());
      await openAtCopy();

      // Closing is not unmounting — the surface stays in the document — so
      // nothing but the timer was ever going to clear this. Escape and reopen
      // inside the window and the next menu was answering to "dr".
      await browser.keyboard('d');
      expect(document.activeElement).toBe(item('Duplicate'));
      await browser.keyboard('{Escape}');
      await openAtCopy();

      await browser.keyboard('r');
      expect(document.activeElement).toBe(item('Rename'));
    });
  });

  describe('accessibility (axe)', () => {
    for (const { name, theme } of [
      { name: 'light', theme: undefined },
      { name: 'dark', theme: 'dark' },
    ] as const) {
      it(`has no violations while OPEN — ${name}`, async () => {
        const { container } = renderUi(
          <main
            style={{
              background: 'var(--fm-color-background)',
              color: 'var(--fm-color-foreground)',
              padding: '1rem',
            }}
          >
            {example()}
          </main>,
          { theme },
        );

        await open();
        await new Promise((resolve) => setTimeout(resolve, 300));
        await expectNoA11yViolations(container);
        await browser.keyboard('{Escape}');
      });
    }
  });
});

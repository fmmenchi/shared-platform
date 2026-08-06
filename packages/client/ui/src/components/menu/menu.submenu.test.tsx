import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from '@vitest/browser/context';
import { Menu } from './menu.component.js';
import { MenuTrigger } from '../menu-trigger/menu-trigger.component.js';
import { MenuContent } from '../menu-content/menu-content.component.js';
import { MenuItem } from '../menu-item/menu-item.component.js';
import { MenuItemTrigger } from '../menu-item-trigger/menu-item-trigger.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

/**
 * A submenu is a `Menu` inside a `MenuContent`. Nothing else declares it, and
 * nothing else has to: the platform nests two popovers by the invoker
 * relationship alone — measured in Chromium, Gecko and WebKit, opening the
 * inner one leaves the outer open, `Escape` unwinds a level at a time, and
 * hiding the outer hides everything in it.
 */
const example = (
  handlers: {
    onEmail?: () => void;
    onSubOpenChange?: (o: boolean) => void;
  } = {},
) => (
  <Menu>
    <MenuTrigger>Actions</MenuTrigger>
    <MenuContent>
      <MenuItem>Rename</MenuItem>
      <Menu onOpenChange={handlers.onSubOpenChange}>
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
    // family it was given and not with the marker it carries. The letter is one
    // the PARENT also answers to — `d` for its Delete — or the two families
    // could be merged and this would still pass.
    await browser.keyboard('d');
    expect(document.activeElement).toBe(item('Email'));

    // A second search, so let the first expire: `d` and `c` inside one window
    // are the search "dc", which is the buffer doing its job.
    await new Promise((resolve) => setTimeout(resolve, 1200));
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

  it('lets the parent menu be used while a submenu is open', async () => {
    const onSubOpenChange = vi.fn();
    render(example({ onSubOpenChange }));
    await open();
    await browser.click(item('Share'));
    await waitFor(() => expect(document.activeElement).toBe(item('Email')));
    expect(onSubOpenChange).toHaveBeenCalledTimes(1);

    // THE REGRESSION THIS EXISTS FOR. The mirror's callback is a dependency of
    // its own subscription, and the parent's context object is re-made whenever
    // its active command changes — so listing it as a dependency, which is what
    // the exhaustive-deps rule asked for, tore the subscription down and built
    // it again on every move in the parent. Measured: the focus was dragged
    // back to the submenu's first command and the consumer was told the submenu
    // had closed and reopened, twice.
    await browser.hover(item('Delete'));
    await waitFor(() => expect(document.activeElement).toBe(item('Delete')));
    expect(onSubOpenChange).toHaveBeenCalledTimes(1);
    expect(menus()).toHaveLength(2);
  });

  it('leaves the inline arrows alone outside a submenu', async () => {
    render(example());
    await open();

    // At the root they are nobody's, and a consumer may want them.
    await browser.keyboard('{ArrowLeft}');
    expect(menus()).toHaveLength(1);
    expect(document.activeElement).toBe(item('Rename'));
  });

  it('leaves a field inside a submenu its own arrows', async () => {
    render(
      <Menu>
        <MenuTrigger>Actions</MenuTrigger>
        <MenuContent>
          <Menu>
            <MenuItemTrigger>Share</MenuItemTrigger>
            <MenuContent>
              <input aria-label="Note" defaultValue="hello" />
              <MenuItem>Email</MenuItem>
            </MenuContent>
          </Menu>
        </MenuContent>
      </Menu>,
    );
    await browser.click(screen.getByRole('button', { name: 'Actions' }));
    await waitFor(() => expect(document.activeElement).toBe(item('Share')));
    await browser.click(item('Share'));
    await waitFor(() => expect(menus()).toHaveLength(2));

    // Measured before the guard: the caret did not move AND the submenu was
    // destroyed. The back arrow is ours only when the key was aimed at one of
    // our commands — the same rule typing already had.
    const field = screen.getByLabelText('Note') as HTMLInputElement;
    field.focus();
    field.setSelectionRange(3, 3);
    await browser.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(field);
    expect(field.selectionStart).toBe(2);
    expect(menus()).toHaveLength(2);
  });

  it('closes every level from a command three deep', async () => {
    const onDeep = vi.fn();
    render(
      <Menu>
        <MenuTrigger>Actions</MenuTrigger>
        <MenuContent>
          <Menu>
            <MenuItemTrigger>Share</MenuItemTrigger>
            <MenuContent>
              <Menu>
                <MenuItemTrigger>Social</MenuItemTrigger>
                <MenuContent>
                  <MenuItem onClick={onDeep}>Mastodon</MenuItem>
                </MenuContent>
              </Menu>
            </MenuContent>
          </Menu>
        </MenuContent>
      </Menu>,
    );
    await browser.click(screen.getByRole('button', { name: 'Actions' }));
    await waitFor(() => expect(document.activeElement).toBe(item('Share')));
    await browser.click(item('Share'));
    await waitFor(() => expect(document.activeElement).toBe(item('Social')));
    await browser.click(item('Social'));
    await waitFor(() => expect(menus()).toHaveLength(3));

    // `closeAll` is a recursion — its only test was two levels deep.
    await browser.keyboard('{Enter}');
    expect(onDeep).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(
        screen
          .getAllByRole('menu', { hidden: true })
          .some((s) => s.matches(':popover-open')),
      ).toBe(false),
    );
  });

  it('says it is closed again once it is', async () => {
    render(example());
    await open();
    const trigger = item('Share');
    await browser.click(trigger);
    await waitFor(() =>
      expect(trigger).toHaveAttribute('aria-expanded', 'true'),
    );

    await browser.keyboard('{Escape}');
    await waitFor(() =>
      expect(trigger).toHaveAttribute('aria-expanded', 'false'),
    );
  });

  it('draws no way back where the arrows are the way back', async () => {
    render(example());
    await open();
    await browser.click(item('Share'));
    await waitFor(() => expect(menus()).toHaveLength(2));

    // The row exists only on a touch screen. Undrawn, it is also out of the
    // accessibility tree and out of the keyboard's walk — one `display: none`
    // says all three.
    expect(
      screen.queryByRole('menuitem', { name: /Back to/i }),
    ).not.toBeInTheDocument();
    await browser.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(item('Copy link'));
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

  it('has no violations with a submenu open', async () => {
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
    );
    await open();
    await browser.click(item('Share'));
    await waitFor(() => expect(menus()).toHaveLength(2));

    // SETTLED first: the surface fades in, and axe reads the mid-transition
    // opacity as a contrast failure on every row. Three defects reached a
    // commit through this gap — a menu inside a menu was never checked at all.
    const [, child] = menus();
    await Promise.all(
      ((child as HTMLElement).getAnimations() ?? []).map((a) => a.finished),
    );
    await expectNoA11yViolations(container);
    await browser.keyboard('{Escape}');
  });
});

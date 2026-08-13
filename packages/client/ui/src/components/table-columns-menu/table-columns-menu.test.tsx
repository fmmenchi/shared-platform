import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { TableColumnsMenu } from './table-columns-menu.component.js';
import type { ColumnListing } from './table-columns-menu.types.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

const columns: ColumnListing[] = [
  { key: 'name', header: 'Nome' },
  { key: 'city', header: 'Città' },
  { key: 'age', header: 'Età' },
];

/** `name` names the rows and never goes; the floor refuses the last visible. */
const canHideWith =
  (hidden: ReadonlySet<string>) =>
  (key: string): boolean => {
    if (key === 'name') return false;
    if (hidden.has(key)) return true;
    return columns.filter((c) => !hidden.has(c.key)).length > 1;
  };

const menu = (
  hidden: ReadonlySet<string>,
  onToggle: (key: string) => void = () => undefined,
) => (
  <TableColumnsMenu
    columns={columns}
    hidden={hidden}
    canHide={canHideWith(hidden)}
    onToggle={onToggle}
  />
);

const open = async () => {
  await browser.click(screen.getByRole('button'));
  await waitFor(() => expect(screen.getByRole('menu')).toBeVisible());
};

describe('TableColumnsMenu', () => {
  it('says how much of the table is showing before it is opened', () => {
    renderUi(menu(new Set(['city'])));

    // THE STATE IS IN THE NAME, not only in the list behind it. A reader
    // arriving at this button by keyboard meets the name first, and "some
    // columns are put away" drawn as a glyph would reach nobody else.
    expect(
      screen.getByRole('button', { name: 'Columns, 2 of 3 shown' }),
    ).toBeInTheDocument();
  });

  it('reports which column was asked for', async () => {
    const onToggle = vi.fn();
    renderUi(menu(new Set(), onToggle));
    await open();

    await browser.click(
      screen.getByRole('menuitemcheckbox', { name: 'Città' }),
    );
    expect(onToggle).toHaveBeenCalledWith('city');
  });

  it('stays open, because putting three away is three decisions', async () => {
    const onToggle = vi.fn();
    renderUi(menu(new Set(), onToggle));
    await open();

    await browser.click(
      screen.getByRole('menuitemcheckbox', { name: 'Città' }),
    );
    // A menu that closed after each would make the reader reopen it twice. This
    // is the one place the part differs from an ordinary command menu.
    expect(screen.getByRole('menu')).toBeVisible();

    await browser.click(screen.getByRole('menuitemcheckbox', { name: 'Età' }));
    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  it('shows what is put away as unchecked', async () => {
    renderUi(menu(new Set(['city'])));
    await open();

    expect(screen.getByRole('menuitemcheckbox', { name: 'Età' })).toBeChecked();
    expect(
      screen.getByRole('menuitemcheckbox', { name: 'Città' }),
    ).not.toBeChecked();
  });

  describe('what it refuses, and why it says so', () => {
    it('names the row header as always shown', async () => {
      renderUi(menu(new Set()));
      await open();

      // A DISABLED CONTROL WITH NO REASON IS A DEAD END. The reason is in the
      // name because that is where a screen-reader user meets it — and it is
      // the specific reason, not a shared "unavailable": this column names the
      // rows, which is a different fact from being the last one left.
      const row = screen.getByRole('menuitemcheckbox', {
        name: 'Nome, always shown because it names the rows',
      });
      // `aria-disabled`, NOT the native attribute — the package's menu commands
      // are inert rather than disabled, so they stay reachable by keyboard and
      // can still say what they are. Asserting `toBeDisabled()` here would be
      // asserting a different design.
      expect(row).toHaveAttribute('aria-disabled', 'true');
    });

    it('names the last one standing as the last one standing', async () => {
      renderUi(menu(new Set(['city', 'age'])));
      await open();

      expect(
        screen.getByRole('menuitemcheckbox', {
          name: 'Nome, the only column still shown',
        }),
      ).toHaveAttribute('aria-disabled', 'true');
      // And the two that are away may still come back.
      expect(
        screen.getByRole('menuitemcheckbox', { name: 'Città' }),
      ).not.toHaveAttribute('aria-disabled');
    });
  });

  describe('putting the columns in order', () => {
    const reorderable = (onMove = vi.fn()) => {
      const order = ['name', 'city', 'age'];
      return (
        <TableColumnsMenu
          columns={columns}
          hidden={new Set()}
          canHide={canHideWith(new Set())}
          onToggle={() => undefined}
          onMove={onMove}
          canMove={(key, delta) => {
            const at = order.indexOf(key);
            return at + delta >= 0 && at + delta < order.length;
          }}
          positionOf={(key) => order.indexOf(key) + 1}
        />
      );
    };

    it('promises no position it cannot honour', async () => {
      // THE HALFWAY STATE, which the type now refuses and a JavaScript
      // consumer can still reach. Measured before this: with `onMove` and
      // `positionOf` and no `canMove`, every entry announced "Nome, 1 of 2" —
      // telling the reader the column moves and where it sits — and
      // Alt+ArrowDown called `onMove` ZERO times, because `canMove?.(…)` is
      // `undefined` and `undefined` is not true. A promise made in the
      // accessible name and refused in silence, to precisely the reader who
      // cannot see that nothing moved.
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      const onMove = vi.fn();
      renderUi(
        // @ts-expect-error the point of the test: the type refuses this pair,
        // and a JavaScript consumer can still reach it.
        <TableColumnsMenu
          columns={columns}
          hidden={new Set()}
          canHide={canHideWith(new Set())}
          onToggle={() => undefined}
          onMove={onMove}
          positionOf={() => 1}
        />,
      );
      await open();

      // It says nothing about positions, which is the honest degradation —
      // moving without the clamp would be guessing on the caller's behalf.
      expect(
        screen.getByRole('menuitemcheckbox', { name: 'Città' }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('menuitemcheckbox', { name: /2 of 3/ }),
      ).not.toBeInTheDocument();

      // And it says so where a developer will see it.
      await waitFor(() =>
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('`canMove`')),
      );
      warn.mockRestore();
    });

    it('says nothing when reordering was never wired at all', async () => {
      // The silent case must stay silent: a warning that fires on correct code
      // teaches people to scroll past the true ones.
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      renderUi(menu(new Set()));
      await open();

      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });

    it('says where each column sits, because the list cannot', async () => {
      renderUi(reorderable());
      await open();

      // A screen reader announces ONE item, not the sequence around it — and
      // the position is the thing that changes as the reader moves it.
      expect(
        screen.getByRole('menuitemcheckbox', { name: 'Città, 2 of 3' }),
      ).toBeInTheDocument();
    });

    it('moves a column with Alt and the arrow keys', async () => {
      const onMove = vi.fn();
      renderUi(reorderable(onMove));
      await open();

      const item = screen.getByRole('menuitemcheckbox', {
        name: 'Città, 2 of 3',
      });
      item.focus();
      await browser.keyboard('{Alt>}{ArrowUp}{/Alt}');

      expect(onMove).toHaveBeenCalledWith('city', -1);
    });

    it('leaves the plain arrows to the menu', async () => {
      // MUTATION-TESTED AS MISSING: dropping the `altKey` guard let a plain
      // ArrowDown reorder the table instead of walking the list, and every
      // test here stayed green. The modifier is the whole distinction between
      // reading the menu and rearranging the view.
      const onMove = vi.fn();
      renderUi(reorderable(onMove));
      await open();

      const first = screen.getByRole('menuitemcheckbox', {
        name: 'Nome, 1 of 3, always shown because it names the rows',
      });
      first.focus();
      await browser.keyboard('{ArrowDown}');

      expect(onMove).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(
        screen.getByRole('menuitemcheckbox', { name: 'Città, 2 of 3' }),
      );
    });

    it('keeps the focus on the column being moved when the move is refused', async () => {
      const onMove = vi.fn();
      renderUi(reorderable(onMove));
      await open();

      // Locked AND first: it carries both facts, which is the whole reason
      // the label is built from parts rather than one replacing the other.
      const first = screen.getByRole('menuitemcheckbox', {
        name: 'Nome, 1 of 3, always shown because it names the rows',
      });
      first.focus();
      await browser.keyboard('{Alt>}{ArrowUp}{/Alt}');

      // The menu's own arrows walk the list. Letting a refused move fall
      // through would send the focus away from the column the reader is
      // holding — the opposite of what a clamp is for.
      expect(onMove).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(first);
    });

    it('says the gesture once, on the menu, not in every entry', async () => {
      renderUi(reorderable());
      await open();

      // Repeated per item it would be three identical clauses read on every
      // arrow press.
      expect(screen.getByRole('menu')).toHaveAccessibleDescription(
        'Alt with the arrow keys moves a column.',
      );
      expect(
        screen.getByRole('menuitemcheckbox', { name: 'Città, 2 of 3' }),
      ).toBeInTheDocument();
    });

    it('says nothing about position when it cannot reorder', async () => {
      renderUi(menu(new Set()));
      await open();

      expect(
        screen.getByRole('menuitemcheckbox', { name: 'Città' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('menu')).not.toHaveAccessibleDescription();
    });
  });

  it('has no violations, open', async () => {
    const { container } = renderUi(menu(new Set(['city'])));
    await open();
    await expectNoA11yViolations(container);
  });
});

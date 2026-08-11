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

  it('has no violations, open', async () => {
    const { container } = renderUi(menu(new Set(['city'])));
    await open();
    await expectNoA11yViolations(container);
  });
});

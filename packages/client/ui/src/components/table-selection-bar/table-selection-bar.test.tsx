import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from '@vitest/browser/context';
import { Table } from '../table/table.component.js';
import { TableSelectionBar } from './table-selection-bar.component.js';
import { ToolbarItem } from '../toolbar-item/toolbar-item.component.js';
import { Button } from '../button/button.component.js';
import { useRowSelection } from '../table/use-row-selection.js';
import { EVERYTHING_SELECTED } from '../../selection/selection.js';
import type { Column } from '../table/table.types.js';
import type { Selection } from '../../selection/selection.types.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

/**
 * The bar makes three promises the table cannot: that the count is readable on
 * screen rather than only announced, that the rows beyond the page can be
 * reached at all, and that clearing does not drop the reader's focus.
 */
interface Person {
  id: string;
  name: string;
}

const people: Person[] = [
  { id: '1', name: 'Zurigo' },
  { id: '2', name: 'Àosta' },
  { id: '3', name: 'Milano' },
];

const columns: Column<Person>[] = [
  { key: 'name', header: 'Nome', rowHeader: true },
];

const include = (...ids: string[]): Selection => ({
  mode: 'include',
  ids: new Set(ids),
});

function Bare(props: {
  selection?: Selection;
  count?: number | undefined;
  total?: number;
  onSelectEverything?: () => void;
  onClear?: () => void;
}) {
  return (
    <TableSelectionBar
      selection={props.selection ?? include('1', '2')}
      count={'count' in props ? props.count : 2}
      total={props.total}
      onSelectEverything={props.onSelectEverything}
      onClear={props.onClear ?? (() => undefined)}
    >
      <ToolbarItem>
        <Button variant="ghost" size="sm">
          Elimina
        </Button>
      </ToolbarItem>
    </TableSelectionBar>
  );
}

/** Table and bar wired the way a consumer wires them. */
function Wired(props: { total?: number }) {
  const selection = useRowSelection({ total: props.total });
  return (
    <>
      <TableSelectionBar {...selection.barProps} />
      <Table
        caption="Persone"
        rows={people}
        columns={columns}
        getRowId={(p) => p.id}
        {...selection.props}
      />
    </>
  );
}

describe('the selection bar', () => {
  it('is not there when nothing is picked', async () => {
    render(<Bare selection={include()} count={0} />);

    // A bar over an empty selection is a row of controls for nothing.
    expect(screen.queryByRole('toolbar')).toBeNull();
  });

  it('says the count on screen, where the announcement cannot be re-read', async () => {
    const { container } = render(<Bare />);

    expect(screen.getByText('Selection: 2')).toBeInTheDocument();
    // NOT a live region ITSELF. `Table` already announces the change through
    // its own, and a second one over the same fact says it twice. Asked of the
    // bar's own root rather than of the document, because our `Button` carries
    // a status region apiece for its pending state — the same thing that made
    // the table's need a data attribute to be pointed at.
    const bar = container.firstElementChild as HTMLElement;
    expect(bar.getAttribute('role')).toBeNull();
    expect(bar.getAttribute('aria-live')).toBeNull();
  });

  it('says so rather than inventing a number when only the server knows', async () => {
    // The state the whole model exists for: a rule covering rows this client
    // never received, and no total to subtract from.
    render(<Bare selection={EVERYTHING_SELECTED} count={undefined} />);

    expect(screen.getByText(/all rows selected/i)).toBeInTheDocument();
  });

  it('offers the rows beyond the page, and only when there are some', async () => {
    const onSelectEverything = vi.fn();
    const { unmount } = render(
      <Bare total={2450} onSelectEverything={onSelectEverything} />,
    );

    // Grouped digits, because "Select all 2450" is a number nobody reads at a
    // glance — and the design system already holds the locale.
    const escalate = screen.getByRole('button', { name: 'Select all 2,450' });
    await browser.click(escalate);
    expect(onSelectEverything).toHaveBeenCalledOnce();
    unmount();

    // Everything already picked: nothing beyond to offer.
    render(<Bare total={2} onSelectEverything={onSelectEverything} />);
    expect(screen.queryByRole('button', { name: /Select all/ })).toBeNull();
  });

  it('makes no offer it cannot honour', async () => {
    // No `total` means nobody on this side knows there is more than the page.
    render(<Bare onSelectEverything={() => undefined} />);
    expect(screen.queryByRole('button', { name: /Select all/ })).toBeNull();
  });

  it('gives focus back to where the reader was when it appeared', async () => {
    // THE FAILURE A CONDITIONAL BAR ALWAYS SHIPS. Clearing unmounts the bar and
    // with it the button just activated, so focus falls to `<body>` — the
    // classic way a keyboard user loses their place on a page.
    render(<Wired />);

    const box = screen.getByRole('checkbox', { name: 'Select Zurigo' });
    await browser.click(box);
    await waitFor(() =>
      expect(screen.getByText('Selection: 1')).toBeInTheDocument(),
    );

    await browser.click(
      screen.getByRole('button', { name: 'Clear selection' }),
    );
    await waitFor(() => expect(screen.queryByRole('toolbar')).toBeNull());

    expect(document.activeElement).toBe(box);
  });

  it('costs one tab stop, not one per action', async () => {
    // The reason it is a `Toolbar` at all: a bar that appears and disappears
    // would otherwise grow and shrink the reader's keyboard under them.
    render(<Bare total={2450} onSelectEverything={() => undefined} />);

    await browser.keyboard('{Tab}');
    const first = document.activeElement;
    expect(first).toBe(
      screen.getByRole('button', { name: 'Select all 2,450' }),
    );

    // Inside, the arrows move — Tab leaves.
    await browser.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Clear selection' }),
    );
  });

  it('takes everything matching, all the way through', async () => {
    // End to end, because this is the path the model exists for and the one
    // nothing in the package could reach before the bar existed.
    const { container } = render(<Wired total={2450} />);

    // Scoped to the bar: the table's live region says the SAME sentence, which
    // is the point of sharing one catalog — the screen and the announcement do
    // not get to disagree — and makes a document-wide query ambiguous.
    const said = () => container.querySelector('[class*="count"]');

    await browser.click(
      screen.getByRole('checkbox', { name: 'Select all rows' }),
    );
    await waitFor(() => expect(said()).toHaveTextContent('Selection: 3'));

    await browser.click(
      screen.getByRole('button', { name: 'Select all 2,450' }),
    );
    await waitFor(() => expect(said()).toHaveTextContent('Selection: 2,450'));
    // Every row on screen reads as picked, and so does every row that is not.
    expect(
      screen.getByRole('checkbox', { name: 'Select Milano' }),
    ).toBeChecked();
  });

  it('announces in the reader’s language', async () => {
    renderUi(<Bare total={2450} onSelectEverything={() => undefined} />, {
      locale: 'it',
    });

    expect(screen.getByText('Selezione: 2')).toBeInTheDocument();
    // NOT "2.450". Italian's CLDR rule leaves four-digit numbers ungrouped
    // while English groups them, and hand-written digit grouping gets that
    // backwards — which is the whole reason the count goes through `Intl`
    // rather than through a template.
    expect(
      screen.getByRole('button', { name: 'Seleziona tutte le 2450' }),
    ).toBeInTheDocument();
  });

  it('has no axe violations, in both themes', async () => {
    const light = render(
      <Bare total={2450} onSelectEverything={() => undefined} />,
    );
    await expectNoA11yViolations(light.container);
    light.unmount();

    const dark = renderUi(
      <Bare selection={EVERYTHING_SELECTED} count={undefined} />,
      {
        theme: 'dark',
      },
    );
    await expectNoA11yViolations(dark.container);
  });

  it('matches its markup', async () => {
    const { container } = render(
      <Bare total={2450} onSelectEverything={() => undefined} />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});

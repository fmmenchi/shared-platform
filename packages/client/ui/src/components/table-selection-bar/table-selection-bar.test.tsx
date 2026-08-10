import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from '@vitest/browser/context';
import { Table } from '../table/table.component.js';
import { TableSelectionBar } from './table-selection-bar.component.js';
import { ToolbarItem } from '../toolbar-item/toolbar-item.component.js';
import { Button } from '../button/button.component.js';
import { useRowSelection } from '../table/use-row-selection.js';
import {
  EVERYTHING_SELECTED,
  NOTHING_SELECTED,
} from '../../selection/selection.js';
import type { Column } from '../table/table.types.js';
import type { Selection } from '../../selection/selection.types.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

/**
 * The bar makes three promises the table cannot: that the count is readable on
 * screen rather than only announced, that the rows beyond the page can be
 * reached at all, and that its disappearance does not drop the reader's focus.
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
  total?: number;
  onSelectEverything?: () => void;
  onClear?: () => void;
}) {
  return (
    <TableSelectionBar
      selection={props.selection ?? include('1', '2')}
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

/**
 * Table and bar wired the way a consumer wires them — bar AFTER the table.
 * Before it, forward Tab never reaches the actions the reader just summoned:
 * they would have to walk backwards past every row checkbox.
 */
function Wired(props: { total?: number; bulk?: boolean }) {
  const selection = useRowSelection({ total: props.total });
  return (
    <>
      <Table
        caption="Persone"
        rows={people}
        columns={columns}
        getRowId={(p) => p.id}
        {...selection.props}
      />
      <TableSelectionBar {...selection.barProps}>
        {props.bulk === true && (
          <ToolbarItem>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => selection.setSelection(NOTHING_SELECTED)}
            >
              Elimina
            </Button>
          </ToolbarItem>
        )}
      </TableSelectionBar>
    </>
  );
}

const said = () => document.querySelector('[role="region"] span');

describe('the selection bar', () => {
  it('is not there when nothing is picked', async () => {
    const { container } = render(<Bare selection={include()} />);

    // The whole bar, not just its toolbar: asserting only the toolbar's absence
    // passes for a bar that still paints its surface and its count.
    expect(container.firstChild).toBeNull();
  });

  it('is not there when an exclude rule has been emptied row by row', async () => {
    // Reachable: the header box clears an `exclude` rule whole, but unticking
    // the last row individually leaves a rule covering nothing. The bar used to
    // stay, reading "Selection: 0" over a live Clear button.
    const { container } = render(
      <Bare
        selection={{ mode: 'exclude', ids: new Set(['1', '2', '3']) }}
        total={3}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('says the count on screen, where the announcement cannot be re-read', async () => {
    render(<Bare />);

    expect(screen.getByText('Selection: 2')).toBeInTheDocument();
    // NOT a live region — `Table` announces the change through its own, and a
    // second one over the same fact says it twice. A named REGION instead, so
    // it is findable by a reader who never saw it arrive.
    const bar = screen.getByRole('region');
    expect(bar).toHaveAccessibleName('Selection: 2');
    expect(bar.getAttribute('aria-live')).toBeNull();
  });

  it('tells the toolbar what it is about', async () => {
    render(<Bare />);

    // Without this a reader who tabs in hears "Selection actions, toolbar" and
    // never the number the bar exists to state.
    const toolbar = screen.getByRole('toolbar');
    const describedBy = toolbar.getAttribute('aria-describedby');
    expect(describedBy).not.toBeNull();
    expect(document.getElementById(describedBy as string)).toHaveTextContent(
      'Selection: 2',
    );
  });

  it('says so rather than inventing a number when only the server knows', async () => {
    render(<Bare selection={EVERYTHING_SELECTED} />);

    expect(screen.getByText(/all rows selected\./i)).toBeInTheDocument();
  });

  it('does not claim everything while a row is visibly unticked', async () => {
    // "All rows selected." is a PERSISTENT statement, so it may not contradict
    // a checkbox three inches away. Under `exclude` with no total the count is
    // unknowable — the exceptions are not.
    render(<Bare selection={{ mode: 'exclude', ids: new Set(['3']) }} />);

    expect(screen.getByText(/except 1/i)).toBeInTheDocument();
  });

  it('offers the rows beyond the page, and only when there are some', async () => {
    const onSelectEverything = vi.fn();
    const { unmount } = render(
      <Bare total={2450} onSelectEverything={onSelectEverything} />,
    );

    // Grouped digits, because "Select all 2450" is a number nobody reads at a
    // glance — and the design system already holds the locale.
    await browser.click(
      screen.getByRole('button', { name: 'Select all 2,450' }),
    );
    // Called with NOTHING: `onClick={onSelectEverything}` would hand it a click
    // event its `() => void` type says it never receives.
    expect(onSelectEverything).toHaveBeenCalledWith();
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

  it('gives focus back when its own Clear is used', async () => {
    render(<Wired />);

    const box = screen.getByRole('checkbox', { name: 'Select Zurigo' });
    await browser.click(box);
    await waitFor(() => expect(said()).toHaveTextContent('Selection: 1'));

    await browser.click(
      screen.getByRole('button', { name: 'Clear selection' }),
    );
    await waitFor(() => expect(screen.queryByRole('region')).toBeNull());

    expect(document.activeElement).toBe(box);
  });

  it('gives focus back when a CONSUMER’s action empties the selection', async () => {
    // The ordinary shape — "delete, then clear" — and the one the first version
    // dropped on `<body>`, because the restore lived in our Clear handler
    // rather than in the disappearance.
    render(<Wired bulk />);

    const box = screen.getByRole('checkbox', { name: 'Select Àosta' });
    await browser.click(box);
    await waitFor(() => expect(said()).toHaveTextContent('Selection: 1'));

    await browser.click(screen.getByRole('button', { name: 'Elimina' }));
    await waitFor(() => expect(screen.queryByRole('region')).toBeNull());

    expect(document.activeElement).toBe(box);
    expect(document.activeElement).not.toBe(document.body);
  });

  it('costs one tab stop, not one per action', async () => {
    // The reason it is a `Toolbar` at all: a bar that appears and disappears
    // would otherwise grow and shrink the reader's keyboard under them.
    render(<Bare total={2450} onSelectEverything={() => undefined} />);

    await browser.keyboard('{Tab}');
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Select all 2,450' }),
    );

    // Inside, the arrows move…
    await browser.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Clear selection' }),
    );

    // …and Tab LEAVES, rather than walking the remaining two controls. The
    // first version of this test never pressed it twice, so a bar costing one
    // stop per action would have passed.
    await browser.keyboard('{Tab}');
    expect(screen.getByRole('toolbar').contains(document.activeElement)).toBe(
      false,
    );
  });

  it('takes everything matching, all the way through', async () => {
    // End to end, because this is the path the model exists for and the one
    // nothing in the package could reach before the bar existed.
    render(<Wired total={2450} />);

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

  it('writes the number in the language of the words around it', async () => {
    renderUi(<Bare total={2450} onSelectEverything={() => undefined} />, {
      locale: 'it',
    });

    expect(screen.getByText('Selezione: 2')).toBeInTheDocument();
    // NOT "2.450". Italian's CLDR rule leaves four-digit numbers ungrouped
    // while English groups them, which is what a hand-written template gets
    // backwards.
    expect(
      screen.getByRole('button', { name: 'Seleziona tutte le 2450' }),
    ).toBeInTheDocument();
  });

  it('follows the copy’s locale, not the reader’s, for the digits', async () => {
    // `de-DE` has no catalog, so the words fall back to English — and German
    // grouping would render "2.450", which an English reader parses as
    // two-point-four-five. Same failure the formatting exists to prevent.
    renderUi(<Bare total={2450} onSelectEverything={() => undefined} />, {
      locale: 'de-DE',
    });

    expect(
      screen.getByRole('button', { name: 'Select all 2,450' }),
    ).toBeInTheDocument();
  });

  it('reads right to left without rewriting the layout', async () => {
    renderUi(<Bare total={2450} onSelectEverything={() => undefined} />, {
      locale: 'ar',
    });

    expect(screen.getByRole('region')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /تحديد الكل/ }),
    ).toBeInTheDocument();
  });

  it('has no axe violations — both states, both themes', async () => {
    // A matrix, not a diagonal: the first version checked each state in one
    // theme only, so the escalation was never axe'd in dark.
    for (const theme of [undefined, 'dark']) {
      for (const selection of [include('1', '2'), EVERYTHING_SELECTED]) {
        const view = renderUi(
          <Bare
            selection={selection}
            total={selection === EVERYTHING_SELECTED ? undefined : 2450}
            onSelectEverything={() => undefined}
          />,
          { theme },
        );
        await expectNoA11yViolations(view.container);
        view.unmount();
      }
    }
  });

  it('matches its markup', async () => {
    const { container } = render(
      <Bare total={2450} onSelectEverything={() => undefined} />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});

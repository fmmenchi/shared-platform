import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from '@vitest/browser/context';
import { Table } from '../table/table.component.js';
import { TableToolbar } from './table-toolbar.component.js';
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
    <TableToolbar
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
    </TableToolbar>
  );
}

/**
 * Table and toolbar wired the way a consumer wires them — toolbar ABOVE the
 * table. It shipped the other way round as an appearing bar, and this comment
 * argued for it; permanent, the description has to come before the rows.
 */
function Wired(props: { total?: number; bulk?: boolean }) {
  const selection = useRowSelection({ total: props.total });
  return (
    <>
      <TableToolbar {...selection.toolbarProps}>
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
      </TableToolbar>
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

const said = () => document.querySelector('[role="region"] > div:first-child');

describe('the table toolbar', () => {
  it('is not there when it has nothing to say and nothing to do', async () => {
    // A container that contains nothing is chrome the consumer pays for on
    // every page. The whole thing, not just its toolbar: asserting only the
    // toolbar's absence passes for one that still paints its surface.
    const { container } = render(
      <TableToolbar selection={include()} onClear={() => undefined} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('is there whenever it has actions, selected or not', async () => {
    // THE POINT OF GENERALISING IT. A permanent container whose contents change
    // is one stable landmark; two that appear and disappear on unrelated
    // schedules are two rotor entries coming and going for reasons the reader
    // cannot correlate.
    render(<Bare selection={include()} />);

    expect(screen.getByRole('region')).toBeInTheDocument();
    // Nothing picked, so nothing to clear — the action is not drawn.
    expect(
      screen.queryByRole('button', { name: 'Clear selection' }),
    ).toBeNull();
  });

  it('is there for a summary alone, with no selection at all', async () => {
    // The shape filters will use: a table that describes its view and does not
    // select still has a toolbar.
    render(<TableToolbar summary="12 di 240" />);

    expect(screen.getByRole('region')).toHaveTextContent('12 di 240');
  });

  it('drops the selection sentence when an exclude rule has been emptied row by row', async () => {
    // Reachable: the header box clears an `exclude` rule whole, but unticking
    // the last row individually leaves a rule covering nothing. It used to read
    // "Selection: 0" over a live Clear button.
    render(
      <Bare
        selection={{ mode: 'exclude', ids: new Set(['1', '2', '3']) }}
        total={3}
      />,
    );

    expect(screen.queryByText(/Selection:/)).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Clear selection' }),
    ).toBeNull();
  });

  it('says the count on screen, where the announcement cannot be re-read', async () => {
    render(<Bare />);

    expect(screen.getByText('Selection: 2')).toBeInTheDocument();
    // NOT a live region — `Table` announces the change through its own, and a
    // second one over the same fact says it twice.
    expect(screen.getByRole('region').getAttribute('aria-live')).toBeNull();
  });

  it('is named stably and DESCRIBED by what it is showing', async () => {
    // Its predecessor took its name from its own count, which made the landmark
    // answer "how many?" — right for a bar that only existed while something
    // was selected, wrong for a permanent one, whose name would then change
    // under the reader every time the view did. The answer survives as a
    // description, which is announced on entry.
    render(<Bare />);

    const region = screen.getByRole('region');
    expect(region).toHaveAccessibleName('Table controls');

    const describedBy = region.getAttribute('aria-describedby');
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

  it('keeps focus where it is when only the selection goes', async () => {
    // WHAT PERMANENCE CHANGED. As a selection-only bar this case dropped focus
    // on `<body>`: the container unmounted and took the control with it. With
    // actions of its own the container stays, the consumer's button stays, and
    // there is nothing to restore — the failure it was guarding against cannot
    // happen. The guard is still there for the case that can (above).
    render(<Wired bulk />);

    const box = screen.getByRole('checkbox', { name: 'Select Àosta' });
    await browser.click(box);
    await waitFor(() => expect(said()).toHaveTextContent('Selection: 1'));

    const remove = screen.getByRole('button', { name: 'Elimina' });
    await browser.click(remove);
    await waitFor(() => expect(said()).not.toHaveTextContent('Selection:'));

    expect(screen.getByRole('region')).toBeInTheDocument();
    expect(document.activeElement).toBe(remove);
    expect(document.activeElement).not.toBe(document.body);
  });

  it('says what is filtered, and how much is left', async () => {
    const onClearFilters = vi.fn();
    render(
      <TableToolbar
        filters={{ city: 'Milano' }}
        filterLabels={{ city: 'Città' }}
        rowCount={12}
        total={240}
        onClearFilters={onClearFilters}
      />,
    );

    // A fraction, because "12" alone does not tell a reader they are not
    // seeing everything.
    expect(screen.getByText('Showing 12 of 240')).toBeInTheDocument();
    // The COLUMNS, not the values: a value can be anything typed and belongs
    // beside its own control, where it is editable.
    expect(screen.getByText(/Filtered by: Città/)).toBeInTheDocument();

    await browser.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(onClearFilters).toHaveBeenCalledOnce();
  });

  it('says so when a filtered column has no human name', async () => {
    // The first version joined the RAW KEYS, so an Italian reader was told
    // "Filtrato per: created_at" — a developer identifier inside localized
    // copy, which is the failure `Column.label` exists to prevent one
    // feature over. The old test used `city`, a key that reads as a word.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(
      <TableToolbar
        filters={{ created_at: '2026' }}
        rowCount={12}
        total={240}
        onClearFilters={() => undefined}
      />,
    );

    expect(screen.getByText(/Filtered by: created_at/)).toBeInTheDocument();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('`filterLabels`'),
    );
    warn.mockRestore();
  });

  it('announces a filter change, because nothing else can', async () => {
    // `Table`'s live region only exists when sorting or selection is wired, and
    // filtering happens outside the component entirely — so applying one
    // deleted rows and told a reader who could not see the table nothing.
    function Filtering() {
      const [rows, setRows] = useState(240);
      return (
        <>
          <button type="button" onClick={() => setRows(12)}>
            filtra
          </button>
          <TableToolbar
            filters={{ city: 'Milano' }}
            filterLabels={{ city: 'Città' }}
            rowCount={rows}
            total={240}
            onClearFilters={() => undefined}
          />
        </>
      );
    }

    render(<Filtering />);
    const status = document.querySelector('[data-toolbar-status]');
    // Silent on arrival: the first render is not news.
    expect(status).toHaveTextContent('');

    await browser.click(screen.getByRole('button', { name: 'filtra' }));
    await waitFor(() => expect(status).toHaveTextContent('Showing 12 of 240'));
  });

  it('does not offer to select rows the filter just removed', async () => {
    // "Select all matching" means everything the QUERY matched, and the query a
    // reader can see is the filter — but `total` is the unfiltered size, so the
    // offer sat inches from "Showing 3 of 240" and took the 237 rows they had
    // just filtered away.
    render(
      <TableToolbar
        selection={include('1')}
        total={240}
        onSelectEverything={() => undefined}
        onClear={() => undefined}
        filters={{ city: 'Milano' }}
        filterLabels={{ city: 'Città' }}
        rowCount={3}
        onClearFilters={() => undefined}
      />,
    );

    expect(screen.queryByRole('button', { name: /Select all/ })).toBeNull();
  });

  it('says nothing about a count when nothing is filtered', async () => {
    // The count of an unfiltered table is not news — the same rule that keeps
    // the live region silent on arrival.
    const { container } = render(
      <TableToolbar filters={{}} rowCount={240} total={240} />,
    );

    // NO CHROME, but the region stays. It used to render nothing at all, and
    // that cost both boundary announcements: the first application inserted a
    // live region that already contained its sentence, which is the canonical
    // case a screen reader does not speak, and clearing the last filter took the
    // region away before it could say the rows had come back.
    expect(container.querySelector('[role="region"]')).toBeNull();
    expect(container.querySelector('[data-toolbar-status]')).toHaveTextContent(
      '',
    );
  });

  it('does not treat a cleared box as a filter that matches nothing', async () => {
    const { container } = render(
      <TableToolbar
        filters={{ city: '   ' }}
        rowCount={240}
        total={240}
        onClearFilters={() => undefined}
      />,
    );

    expect(container.querySelector('[role="region"]')).toBeNull();
  });

  it('renders nothing at all when it is not the filters’ bar', async () => {
    // Without `filters` there is no live region to keep: nothing to say, nothing
    // to do, and nothing that will later need to announce a transition.
    const { container } = render(<TableToolbar />);

    expect(container.firstChild).toBeNull();
  });

  it('announces the first application, and the clear that undoes it', async () => {
    function Filtered() {
      const [filters, setFilters] = useState<Record<string, string>>({});
      const rows = filters.city === undefined ? 240 : 3;
      return (
        <>
          <button type="button" onClick={() => setFilters({ city: 'Milano' })}>
            filtra
          </button>
          <TableToolbar
            filters={filters}
            filterLabels={{ city: 'Città' }}
            rowCount={rows}
            total={240}
            onClearFilters={() => setFilters({})}
          />
        </>
      );
    }
    render(<Filtered />);

    const status = () => document.querySelector('[data-toolbar-status]');
    expect(status()).toHaveTextContent('');

    await browser.click(screen.getByRole('button', { name: 'filtra' }));
    // The region was already on the page and empty, so this is an ADDITION to a
    // live region rather than a populated one being inserted.
    await waitFor(() => expect(status()).toHaveTextContent('Showing 3 of 240'));

    await browser.click(screen.getByRole('button', { name: /Clear filters/ }));
    // NOT `''`. Emptying a `role="status"` announces nothing — it implies
    // `aria-relevant="additions text"`, so a removal is not relevant — and every
    // row coming back is exactly the kind of change that has to be spoken.
    await waitFor(() => expect(status()).toHaveTextContent(/Filters cleared/i));
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

      // AND THE FILTERED STATE, which is the one that introduced a new colour
      // (`.quiet`) and a new control — and which the matrix skipped, along the
      // very axis this commit added.
      const filtered = renderUi(
        <TableToolbar
          filters={{ city: 'Milano' }}
          filterLabels={{ city: 'Città' }}
          rowCount={12}
          total={240}
          onClearFilters={() => undefined}
        />,
        { theme },
      );
      await expectNoA11yViolations(filtered.container);
      filtered.unmount();
    }
  });

  it('matches its markup', async () => {
    const { container } = render(
      <Bare total={2450} onSelectEverything={() => undefined} />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});

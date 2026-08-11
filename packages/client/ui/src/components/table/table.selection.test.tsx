import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from '@vitest/browser/context';
import { Table } from './table.component.js';
import { useRowSelection } from './use-row-selection.js';
import { useTableSort } from './use-table-sort.js';
import type { Column } from './table.types.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

/**
 * Selection is where a table starts making promises about rows the reader
 * cannot see, so what is proved here is the promises: that every checkbox says
 * WHICH row it selects, that the header box carries all three of its states,
 * that the selection survives a re-sort, and that the component does not claim
 * a thing a `<table>` cannot say.
 *
 * The set algebra is proved in `selection/selection.test.ts` and the pair in
 * `use-row-selection.test.tsx` — not here, through markup.
 */
interface Person {
  id: string;
  name: string;
  age: number;
}

const people: Person[] = [
  { id: '1', name: 'Zurigo', age: 30 },
  { id: '2', name: 'Àosta', age: 9 },
  { id: '3', name: 'Milano', age: 41 },
];

const columns: Column<Person>[] = [
  { key: 'name', header: 'Nome', rowHeader: true },
  { key: 'age', header: 'Età', align: 'end' },
];

const sortableColumns: Column<Person>[] = [
  { key: 'name', header: 'Nome', rowHeader: true, sortable: true },
  { key: 'age', header: 'Età', align: 'end' },
];

function Selectable(props: { rows?: Person[]; columns?: Column<Person>[] }) {
  const selection = useRowSelection();
  return (
    <Table
      caption="Persone"
      rows={props.rows ?? people}
      columns={props.columns ?? columns}
      getRowId={(p) => p.id}
      {...selection.props}
    />
  );
}

const status = () => document.querySelector('[data-table-status]');
const selectedRows = () =>
  Array.from(document.querySelectorAll('tbody tr[data-selected]'));

describe('a selectable table', () => {
  it('says which row each checkbox selects', async () => {
    render(<Selectable />);

    // THE PART NOBODY GETS RIGHT. Five boxes called "Select row" are five
    // controls a screen reader cannot tell apart; pointed at the row's own
    // header cell they carry the noun the reader needs.
    expect(
      screen.getByRole('checkbox', { name: 'Select Zurigo' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: 'Select Àosta' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: 'Select Milano' }),
    ).toBeInTheDocument();
  });

  it('marks the row without claiming something a table cannot say', async () => {
    render(<Selectable />);

    await browser.click(
      screen.getByRole('checkbox', { name: 'Select Zurigo' }),
    );
    await waitFor(() => expect(selectedRows()).toHaveLength(1));

    // `aria-selected` belongs to `grid` and `treegrid`. On a row inside a
    // `table` it is ignored, so writing it would be the component claiming to
    // announce a state it does not announce. The checkbox IS the state.
    expect(document.querySelector('tr[aria-selected]')).toBeNull();
    expect(
      screen.getByRole('checkbox', { name: 'Select Zurigo' }),
    ).toBeChecked();
  });

  it('carries all three states in the header box', async () => {
    render(<Selectable />);
    const all = screen.getByRole('checkbox', { name: 'Select all rows' });

    expect(all).not.toBeChecked();
    expect(all).toHaveProperty('indeterminate', false);

    // One of three: MIXED, which the DOM has no attribute for — it is a
    // property, and our `Checkbox` is the reason it is set at all.
    await browser.click(screen.getByRole('checkbox', { name: 'Select Àosta' }));
    await waitFor(() => expect(all).toHaveProperty('indeterminate', true));
    expect(all).not.toBeChecked();

    // A reader clicking a half-filled box is completing it, not emptying it.
    await browser.click(all);
    await waitFor(() => expect(selectedRows()).toHaveLength(3));
    expect(all).toBeChecked();
    expect(all).toHaveProperty('indeterminate', false);

    await browser.click(all);
    await waitFor(() => expect(selectedRows()).toHaveLength(0));
  });

  it('announces the header box, and only the header box — in either order', async () => {
    render(<Selectable />);

    expect(status()).toHaveTextContent('');

    // A single box announces its own checked state natively; repeating a count
    // over it doubles every tick.
    await browser.click(
      screen.getByRole('checkbox', { name: 'Select Zurigo' }),
    );
    await waitFor(() => expect(selectedRows()).toHaveLength(1));
    expect(status()).toHaveTextContent('');

    // The header box changes many rows at once, and the count is the news —
    // "checked" does not say that everything came with it.
    await browser.click(
      screen.getByRole('checkbox', { name: 'Select all rows' }),
    );
    await waitFor(() => expect(status()).toHaveTextContent('Selection: 3'));

    // AND THE OTHER ORDER, which is where the first version failed. The
    // announcement was derived from the current coverage, so once the header
    // had spoken every row tick rewrote the region — the exact doubling this
    // component argues against. The old test only ever tried row-then-header,
    // the one order in which the flag was still unset.
    await browser.click(screen.getByRole('checkbox', { name: 'Select Àosta' }));
    await waitFor(() => expect(selectedRows()).toHaveLength(2));
    expect(status()).toHaveTextContent('');

    await browser.click(
      screen.getByRole('checkbox', { name: 'Select all rows' }),
    );
    await waitFor(() => expect(status()).toHaveTextContent('Selection: 3'));
    await browser.click(
      screen.getByRole('checkbox', { name: 'Select all rows' }),
    );
    await waitFor(() => expect(status()).toHaveTextContent(/cleared/i));
  });

  it('does not speak because the DATA moved', async () => {
    // No interaction at all: a refetch returning one row fewer used to move the
    // region from "Selection: 3" to "Selection: 2" and announce it. A region
    // whose text is a function of the rows speaks whenever the rows do.
    function Refetching() {
      const [rows, setRows] = useState(people);
      const selection = useRowSelection();
      return (
        <>
          <button type="button" onClick={() => setRows(people.slice(0, 2))}>
            refetch
          </button>
          <Table
            caption="Persone"
            rows={rows}
            columns={columns}
            getRowId={(p) => p.id}
            {...selection.props}
          />
        </>
      );
    }

    render(<Refetching />);
    await browser.click(
      screen.getByRole('checkbox', { name: 'Select all rows' }),
    );
    await waitFor(() => expect(status()).toHaveTextContent('Selection: 3'));

    await browser.click(screen.getByRole('button', { name: 'refetch' }));
    await waitFor(() => expect(selectedRows()).toHaveLength(2));
    // The sentence was captured when the reader clicked, so nothing rewrote it.
    expect(status()).toHaveTextContent('Selection: 3');
  });

  it('still names a row whose name is not words', async () => {
    // A one-hole message needs a string, and a row header may be a link, an
    // icon or an `<abbr>`. That case keeps the two-node reference — worse for
    // word order, which is why it is the fallback and not the rule, and far
    // better than a checkbox called only "Select".
    render(
      <Selectable
        columns={[
          {
            key: 'name',
            header: 'Nome',
            rowHeader: true,
            cell: (p) => <a href={`/p/${p.id}`}>{p.name}</a>,
          },
          { key: 'age', header: 'Età', align: 'end' },
        ]}
      />,
    );

    expect(
      screen.getByRole('checkbox', { name: 'Select Zurigo' }),
    ).toBeInTheDocument();
  });

  it('keeps the verb out of the column header', async () => {
    render(<Selectable />);

    // A `columnheader` takes its name from its content, so parking the hidden
    // verb in that cell made the column announce itself as "Select Select all
    // rows" — and a reader arrowing across a row heard the word three times.
    const [selectColumn] = screen.getAllByRole('columnheader');
    expect(selectColumn).toHaveAccessibleName('Select all rows');
  });

  it('offers nothing to take on an empty table', async () => {
    render(<Selectable rows={[]} />);

    // It was live, changed nothing, and announced that a selection had been
    // cleared.
    expect(
      screen.getByRole('checkbox', { name: 'Select all rows' }),
    ).toBeDisabled();
  });

  it('keeps the selection when the rows are reordered underneath it', async () => {
    // The reason `getRowId` was required before any of this existed. Keyed by
    // position instead, a re-sort moves the ticks to whichever rows arrive in
    // those slots — and it looks exactly like our bug.
    function SortedAndSelectable() {
      const sort = useTableSort(people, {});
      const selection = useRowSelection();
      return (
        <Table
          caption="Persone"
          rows={sort.rows}
          columns={sortableColumns}
          getRowId={(p) => p.id}
          {...sort.props}
          {...selection.props}
        />
      );
    }

    render(<SortedAndSelectable />);
    await browser.click(
      screen.getByRole('checkbox', { name: 'Select Milano' }),
    );
    await waitFor(() => expect(selectedRows()).toHaveLength(1));

    await browser.click(screen.getByRole('button', { name: /Nome/ }));

    // Àosta, Milano, Zurigo — and the tick is still on Milano, now the second
    // row rather than the third.
    await waitFor(() =>
      expect(
        screen.getAllByRole('rowheader').map((c) => c.textContent),
      ).toEqual(['Àosta', 'Milano', 'Zurigo']),
    );
    expect(
      screen.getByRole('checkbox', { name: 'Select Milano' }),
    ).toBeChecked();
    expect(selectedRows()).toHaveLength(1);
  });

  it('counts the checkbox column into the empty row', async () => {
    render(<Selectable rows={[]} />);

    // A short `colSpan` leaves the message under one column instead of across
    // the table — and adding a column is exactly when a hand-written number
    // goes wrong.
    const cell = document.querySelector('tbody td');
    expect(cell).toHaveAttribute('colspan', '3');
  });

  it('has no axe violations selected, in both themes', async () => {
    const light = render(<Selectable />);
    await browser.click(
      screen.getByRole('checkbox', { name: 'Select Zurigo' }),
    );
    await waitFor(() => expect(selectedRows()).toHaveLength(1));
    await expectNoA11yViolations(light.container);
    light.unmount();

    const dark = renderUi(<Selectable />, { theme: 'dark' });
    await browser.click(screen.getByRole('checkbox', { name: 'Select Àosta' }));
    await waitFor(() => expect(selectedRows()).toHaveLength(1));
    await expectNoA11yViolations(dark.container);
  });

  it('matches its markup', async () => {
    const { container } = render(<Selectable />);
    expect(container).toMatchSnapshot();
  });
});

describe('what it refuses to do quietly', () => {
  it('draws no column, and says so, when nothing listens', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(
      <Table
        caption="Persone"
        rows={people}
        columns={columns}
        getRowId={(p) => p.id}
        selection={{ mode: 'include', ids: new Set(['1']) }}
      />,
    );

    expect(screen.queryByRole('checkbox')).toBeNull();
    // AND NO TINT EITHER. Painted from `selection` alone, the row conveyed its
    // state by colour and nothing else — with no checkbox to carry it and
    // `aria-selected` saying nothing in a table, that state was invisible to
    // every non-sighted reader. WCAG 1.4.1.
    expect(document.querySelectorAll('tbody tr[data-selected]')).toHaveLength(
      0,
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('nothing is wired to `onRowSelectToggle`'),
    );
    warn.mockRestore();
  });

  it('draws no header box, and says so, when only the rows are wired', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(
      <Table
        caption="Persone"
        rows={people}
        columns={columns}
        getRowId={(p) => p.id}
        selection={{ mode: 'include', ids: new Set() }}
        onRowSelectToggle={() => undefined}
      />,
    );

    // It used to render, click, change nothing — and announce that a selection
    // had been cleared. The same dead control this file refuses twice over.
    expect(
      screen.queryByRole('checkbox', { name: 'Select all rows' }),
    ).toBeNull();
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('nothing is wired to `onSelectAllToggle`'),
    );
    warn.mockRestore();
  });

  it('says so when a row renders no name for its checkbox to borrow', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(
      <Selectable
        rows={[
          { id: '1', name: '', age: 30 },
          { id: '2', name: 'Milano', age: 41 },
        ]}
      />,
    );

    // The failure the label exists to prevent, arriving through an optional
    // field rather than a missing column — and previously silent, because the
    // guard only asked whether a `rowHeader` column existed.
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('renders nothing in its `rowHeader` column'),
    );
    warn.mockRestore();
  });

  it('says so when two rows answer the same id', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(
      <Selectable
        rows={[
          { id: 'same', name: 'Zurigo', age: 30 },
          { id: 'same', name: 'Milano', age: 41 },
        ]}
      />,
    );

    // Two rows that are one row to the rule: ticking either ticks both, and the
    // request that follows names a record the reader never chose.
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('two rows share a `getRowId`'),
    );
    warn.mockRestore();
  });

  it('says so when no column names the row, and falls back honestly', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(
      <Selectable
        columns={[
          { key: 'name', header: 'Nome' },
          { key: 'age', header: 'Età' },
        ]}
      />,
    );

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('no column is marked `rowHeader`'),
    );
    // Three boxes with the same name — which is the state the warning exists to
    // get fixed, said out loud rather than papered over with a row number that
    // means nothing after a sort.
    expect(
      screen.getAllByRole('checkbox', { name: 'Select row' }),
    ).toHaveLength(3);
    warn.mockRestore();
  });

  it('ships no checkbox column for a table that was never given a selection', async () => {
    render(
      <Table
        caption="Persone"
        rows={people}
        columns={columns}
        getRowId={(p) => p.id}
      />,
    );

    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(status()).toBeNull();
  });
});

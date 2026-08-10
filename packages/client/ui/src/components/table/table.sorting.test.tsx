import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from '@vitest/browser/context';
import { Table } from './table.component.js';
import { useSortState, nextSort } from './use-sort-state.js';
import { useTableSort } from './use-table-sort.js';
import type { Column } from './table.types.js';
import type { SortState } from '../../sorting/compare.types.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

/**
 * Sorting is where the table stops being markup and starts making promises, so
 * what is proved here is the promises: exactly one column claims `aria-sort`,
 * the trigger is a real control, the change is ANNOUNCED, and a controlled
 * table never reorders behind the caller's back.
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
  { key: 'name', header: 'Nome', rowHeader: true, sortable: true },
  { key: 'age', header: 'Età', align: 'end', sortable: true },
];

function Sorted(props: { rows?: Person[] }) {
  const sort = useTableSort(props.rows ?? people, {});
  return (
    <Table
      caption="Persone"
      rows={sort.rows}
      columns={columns}
      getRowId={(p) => p.id}
      {...sort.props}
    />
  );
}

const names = () =>
  screen.getAllByRole('rowheader').map((cell) => cell.textContent);

describe('nextSort', () => {
  it('walks asc → desc → none, and starts over on another column', () => {
    // THREE STOPS, NOT TWO. A two-state toggle leaves no way back to the order
    // the data arrived in — the only order that carries meaning in a table of
    // events or a ranking the server chose.
    expect(nextSort(null, 'name')).toEqual({ key: 'name', direction: 'asc' });
    expect(nextSort({ key: 'name', direction: 'asc' }, 'name')).toEqual({
      key: 'name',
      direction: 'desc',
    });
    expect(nextSort({ key: 'name', direction: 'desc' }, 'name')).toBeNull();
    expect(nextSort({ key: 'name', direction: 'desc' }, 'age')).toEqual({
      key: 'age',
      direction: 'asc',
    });
  });
});

describe('a sortable table', () => {
  it('puts a real button in the header, not a click handler on the cell', async () => {
    render(<Sorted />);

    // Our `Button`, so the focus ring and the target size arrive with it —
    // `NavGroup` hand-rolled one once and shipped with no ring at all.
    expect(screen.getByRole('button', { name: /Nome/ })).toBeInTheDocument();
  });

  it('orders locale-aware without a comparator being written', async () => {
    render(<Sorted />);

    await browser.click(screen.getByRole('button', { name: /Nome/ }));

    // `<` would put "Àosta" last: accented letters sit above `z` in code point
    // order. This is the whole reason the engine is ours.
    await waitFor(() => expect(names()).toEqual(['Àosta', 'Milano', 'Zurigo']));
  });

  it('claims aria-sort on exactly one column, and only when sorted', async () => {
    render(<Sorted />);

    const sorted = () =>
      screen
        .getAllByRole('columnheader')
        .filter((th) => th.hasAttribute('aria-sort'));

    expect(sorted()).toHaveLength(0);

    await browser.click(screen.getByRole('button', { name: /Nome/ }));
    await waitFor(() => expect(sorted()).toHaveLength(1));
    expect(sorted()[0]).toHaveAttribute('aria-sort', 'ascending');

    // Moving to another column must not leave two claims behind.
    await browser.click(screen.getByRole('button', { name: /Età/ }));
    await waitFor(() => expect(sorted()).toHaveLength(1));
    expect(sorted()[0]).toHaveTextContent('Età');
  });

  it('reverses, then returns to the order the data arrived in', async () => {
    render(<Sorted />);
    const trigger = screen.getByRole('button', { name: /Nome/ });

    await browser.click(trigger);
    await waitFor(() => expect(names()[0]).toBe('Àosta'));

    await browser.click(trigger);
    await waitFor(() => expect(names()[0]).toBe('Zurigo'));

    await browser.click(trigger);
    // Not "reversed again" — the rows as they were given.
    await waitFor(() => expect(names()).toEqual(['Zurigo', 'Àosta', 'Milano']));
  });

  it('announces the change, because the rows move in silence otherwise', async () => {
    render(<Sorted />);

    // Addressed explicitly: `Button` renders a status region of its own for
    // its pending state, so a table with two sortable headers has three.
    const status = document.querySelector('[data-table-status]');
    // Empty at rest: a live region mounted already-populated is routinely
    // missed, which is wanted here — the initial state is not news.
    expect(status).toHaveTextContent('');

    await browser.click(screen.getByRole('button', { name: /Nome/ }));
    await waitFor(() => expect(status).toHaveTextContent(/Nome/));
    expect(status).toHaveTextContent(/ascending/i);
  });

  it('announces in the reader’s language', async () => {
    renderUi(<Sorted />, { locale: 'it' });

    await browser.click(screen.getByRole('button', { name: /Nome/ }));
    await waitFor(() =>
      expect(document.querySelector('[data-table-status]')).toHaveTextContent(
        /crescente/,
      ),
    );
  });

  it('sorts a domain column by the comparator it was given', async () => {
    const RANK = { bassa: 0, media: 1, alta: 2 };
    interface Ticket {
      id: string;
      priority: 'bassa' | 'media' | 'alta';
    }
    const tickets: Ticket[] = [
      { id: '1', priority: 'media' },
      { id: '2', priority: 'alta' },
      { id: '3', priority: 'bassa' },
    ];

    function Domain() {
      const sort = useTableSort(tickets, {
        compare: { priority: (a, b) => RANK[a.priority] - RANK[b.priority] },
      });
      return (
        <Table
          caption="Ticket"
          rows={sort.rows}
          getRowId={(t) => t.id}
          columns={[
            {
              key: 'priority',
              header: 'Priorità',
              rowHeader: true,
              sortable: true,
            },
          ]}
          {...sort.props}
        />
      );
    }

    render(<Domain />);
    await browser.click(screen.getByRole('button', { name: /Priorità/ }));

    // Alphabetically this is alta, bassa, media. The consumer's comparator says
    // otherwise, and only they can know that.
    await waitFor(() => expect(names()).toEqual(['bassa', 'media', 'alta']));
  });

  it('has no axe violations while sorted', async () => {
    const { container } = render(<Sorted />);
    await browser.click(screen.getByRole('button', { name: /Nome/ }));
    await waitFor(() =>
      expect(document.querySelector('[data-table-status]')).toHaveTextContent(
        /Nome/,
      ),
    );

    await expectNoA11yViolations(container);
  });
});

describe('when something else does the ordering', () => {
  it('never reorders behind the caller’s back', async () => {
    // The controlled case, which is also the server case: the table shows the
    // state and touches the rows never. If it sorted too, a server-ordered page
    // would be re-sorted on top of itself.
    function Controlled() {
      const [sort, setSort] = useState<SortState | null>(null);
      return (
        <>
          <Table
            caption="Persone"
            rows={people}
            columns={columns}
            getRowId={(p) => p.id}
            sort={sort}
            onSortChange={setSort}
          />
          <output>{sort ? `${sort.key}:${sort.direction}` : 'none'}</output>
        </>
      );
    }

    render(<Controlled />);
    await browser.click(screen.getByRole('button', { name: /Nome/ }));

    // The intent was reported…
    await waitFor(() =>
      expect(document.querySelector('output')).toHaveTextContent('name:asc'),
    );
    // …and the rows are exactly as they were handed over.
    expect(names()).toEqual(['Zurigo', 'Àosta', 'Milano']);
  });

  it('carries the state a query key wants, unchanged', async () => {
    // Rendered rather than captured into a variable: the shape a consumer
    // actually uses is `queryKey: ['people', sort.state]`, and asserting on the
    // rendered value proves the same thing without reaching out of the tree.
    function Probe() {
      const sort = useSortState({ defaultSortKey: 'name' });
      return (
        <>
          <output>{JSON.stringify(sort.state)}</output>
          <Table
            caption="Persone"
            rows={people}
            columns={columns}
            getRowId={(p) => p.id}
            {...sort.props}
          />
        </>
      );
    }

    render(<Probe />);
    expect(document.querySelector('output')).toHaveTextContent(
      '{"key":"name","direction":"asc"}',
    );
  });
});

describe('a column that looks sortable and is not', () => {
  it('says so, because an arrow that reorders nothing is the worst kind', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(
      <Table
        caption="Persone"
        rows={people}
        columns={columns}
        getRowId={(p) => p.id}
      />,
    );

    // The table's version of a field that accepts typing and submits nothing.
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('marked `sortable` but nothing is wired'),
    );
    warn.mockRestore();
  });
});

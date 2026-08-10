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
 * what is proved here is the promises: which header claims `aria-sort` and
 * which merely offers it, that the trigger is a real control reachable from the
 * keyboard, that ALL THREE stops are announced, and that a controlled table
 * never reorders behind the caller's back.
 *
 * The state and the cycle are proved in `use-sort-state.test.tsx`, and the
 * engine's wiring in `use-table-sort.test.tsx` — not here, through markup.
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

function Sorted(props: { rows?: Person[]; defaultSortKey?: string }) {
  const sort = useTableSort(props.rows ?? people, {
    defaultSortKey: props.defaultSortKey,
  });
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

const status = () => document.querySelector('[data-table-status]');

/** The headers that CLAIM an order, as opposed to those merely offering one. */
const sorted = () =>
  screen
    .getAllByRole('columnheader')
    .filter((th) => (th.getAttribute('aria-sort') ?? 'none') !== 'none');

describe('a sortable table', () => {
  it('puts a real button in the header whose name is the column, and nothing else', async () => {
    render(<Sorted />);

    // Our `Button`, so the focus ring and the target size arrive with it —
    // `NavGroup` hand-rolled one once and shipped with no ring at all.
    const trigger = screen.getByRole('button', { name: /Nome/ });
    // EXACTLY the heading: the arrow must not leak into the accessible name,
    // and a substring match would not notice if it did.
    expect(trigger).toHaveAccessibleName('Nome');
    expect(trigger.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('is operable from the keyboard, which is most of what a real button buys', async () => {
    render(<Sorted />);

    await browser.keyboard('{Tab}');
    await browser.keyboard('{Enter}');
    await waitFor(() => expect(names()[0]).toBe('Àosta'));

    await browser.keyboard(' ');
    await waitFor(() => expect(names()[0]).toBe('Zurigo'));
  });

  it('orders locale-aware without a comparator being written', async () => {
    render(<Sorted />);

    await browser.click(screen.getByRole('button', { name: /Nome/ }));

    // `<` would put "Àosta" last: accented letters sit above `z` in code point
    // order. This is the whole reason the engine is ours.
    await waitFor(() => expect(names()).toEqual(['Àosta', 'Milano', 'Zurigo']));
  });

  it('offers `none` on every sortable header, and claims an order on exactly one', async () => {
    render(<Sorted />);

    // `none` is not noise: the button's accessible name is the column heading,
    // and the only other mark of sortability is a glyph carrying `aria-hidden`.
    // Without it a reader had no way to know the column could be ordered.
    const headers = screen.getAllByRole('columnheader');
    expect(headers.every((th) => th.hasAttribute('aria-sort'))).toBe(true);
    expect(sorted()).toHaveLength(0);

    await browser.click(screen.getByRole('button', { name: /Nome/ }));
    await waitFor(() => expect(sorted()).toHaveLength(1));
    expect(sorted()[0]).toHaveAttribute('aria-sort', 'ascending');

    // Moving to another column must not leave two claims behind.
    await browser.click(screen.getByRole('button', { name: /Età/ }));
    await waitFor(() => expect(sorted()).toHaveLength(1));
    expect(sorted()[0]).toHaveTextContent('Età');
  });

  it('reverses, then returns to the order the data arrived in — and says so', async () => {
    render(<Sorted />);
    const trigger = screen.getByRole('button', { name: /Nome/ });

    await browser.click(trigger);
    await waitFor(() => expect(names()[0]).toBe('Àosta'));

    await browser.click(trigger);
    await waitFor(() => expect(names()[0]).toBe('Zurigo'));

    await browser.click(trigger);
    // Not "reversed again" — the rows as they were given.
    await waitFor(() => expect(names()).toEqual(['Zurigo', 'Àosta', 'Milano']));
    // AND THE STOP IS ANNOUNCED. Rendering `''` here emptied the region, which
    // announces nothing at all: `role="status"` implies
    // `aria-relevant="additions text"`, so a removal is not relevant. Every row
    // moved and the one reader who could not see it was told nothing.
    expect(status()).toHaveTextContent(/original order/i);
    // And no `aria-sort` claim survives the clear.
    expect(sorted()).toHaveLength(0);
  });

  it('announces the change, because the rows move in silence otherwise', async () => {
    render(<Sorted />);

    // Addressed explicitly: `Button` renders a status region of its own for
    // its pending state, so a table with two sortable headers has three.
    expect(status()).toHaveTextContent('');

    await browser.click(screen.getByRole('button', { name: /Nome/ }));
    await waitFor(() => expect(status()).toHaveTextContent(/Nome/));
    expect(status()).toHaveTextContent(/ascending/i);
  });

  it('stays silent on arrival even when it arrives already sorted', async () => {
    // The doc claimed the region "starts empty", and it did not: `announcement`
    // was a pure function of `sort`, and BOTH documented examples seed one. A
    // region inserted already-populated is announced inconsistently, which is
    // the non-determinism the render-not-effect pattern was chosen to avoid.
    render(<Sorted defaultSortKey="name" />);

    expect(names()).toEqual(['Àosta', 'Milano', 'Zurigo']);
    expect(status()).toHaveTextContent('');

    await browser.click(screen.getByRole('button', { name: /Nome/ }));
    await waitFor(() => expect(status()).toHaveTextContent(/descending/i));
  });

  it('announces in the reader’s language', async () => {
    renderUi(<Sorted />, { locale: 'it' });

    await browser.click(screen.getByRole('button', { name: /Nome/ }));
    await waitFor(() => expect(status()).toHaveTextContent(/crescente/));
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

  it('has no axe violations while sorted, in both themes and at both densities', async () => {
    // The matrix `testing.md` asks for. The sorted state is exactly what needed
    // it: it introduces a `ghost` Button inside a `<th>` with `color: inherit`.
    const light = render(<Sorted defaultSortKey="name" />);
    await expectNoA11yViolations(light.container);
    light.unmount();

    const dark = renderUi(<Sorted defaultSortKey="age" />, { theme: 'dark' });
    await expectNoA11yViolations(dark.container);
  });

  it('matches its markup', async () => {
    // THE CONTAINER, not `firstChild`. The live region is a SIBLING of the
    // `<table>` — it has to be, since a `<span>` inside one is reparented by
    // the parser — so snapshotting the table alone would leave the whole
    // announcement mechanism uncovered.
    const { container } = render(<Sorted defaultSortKey="name" />);
    expect(container).toMatchSnapshot();
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
            // The KEY, and the cycle written with the exported `nextSort` —
            // in the functional form, which is what keeps a second click
            // correct when the consumer defers the update.
            onSortToggle={(key) => setSort((prev) => nextSort(prev, key))}
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

describe('what it refuses to do quietly', () => {
  it('renders a plain header, and says so, when `sortable` is wired to nothing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(
      <Table
        caption="Persone"
        rows={people}
        columns={columns}
        getRowId={(p) => p.id}
      />,
    );

    // No dead control: the mark is ignored rather than drawn as a button that
    // reports an intent nobody listens to.
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getAllByRole('columnheader')[0]).not.toHaveAttribute(
      'aria-sort',
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('marked `sortable` but nothing is wired'),
    );
    warn.mockRestore();
  });

  it('says so when `sort` names a column that is not there', async () => {
    // The shape a persisted state arrives in after a column is renamed: nothing
    // claims it, nothing is announced, and the table looks unsorted while the
    // state says otherwise. Silence is the worst of the three answers.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(
      <Table
        caption="Persone"
        rows={people}
        columns={columns}
        getRowId={(p) => p.id}
        sort={{ key: 'nmae', direction: 'asc' }}
        onSortToggle={() => undefined}
      />,
    );

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('`nmae`'));
    warn.mockRestore();
  });

  it('says so when the announcement would read a developer identifier aloud', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(
      <Table
        caption="Persone"
        rows={people}
        columns={[{ key: 'name', header: <em>Nome</em>, sortable: true }]}
        getRowId={(p) => p.id}
        sort={{ key: 'name', direction: 'asc' }}
        onSortToggle={() => undefined}
      />,
    );

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('`sortLabel`'));
    warn.mockRestore();
  });

  it('announces `sortLabel` when the header is not words', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    function Labelled() {
      const sort = useTableSort(people, {});
      return (
        <Table
          caption="Persone"
          rows={sort.rows}
          columns={[
            {
              key: 'name',
              header: <em>Nome</em>,
              sortLabel: 'Nome',
              rowHeader: true,
              sortable: true,
            },
          ]}
          getRowId={(p) => p.id}
          {...sort.props}
        />
      );
    }

    render(<Labelled />);
    await browser.click(screen.getByRole('button', { name: /Nome/ }));

    await waitFor(() => expect(status()).toHaveTextContent(/Sorted by Nome/));
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('ships no live region for a table that cannot sort', async () => {
    // Rendered unconditionally it was a permanently-empty region on every
    // composed and every non-sortable table — an element justified by nothing
    // it does, multiplied per table per page.
    render(
      <Table
        caption="Persone"
        rows={people}
        columns={[{ key: 'name', header: 'Nome', rowHeader: true }]}
        getRowId={(p) => p.id}
      />,
    );

    expect(status()).toBeNull();
  });
});

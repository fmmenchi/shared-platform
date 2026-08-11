import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from '@vitest/browser/context';
import { Table } from './table.component.js';
import { useSortState, nextSort } from './use-sort-state.js';
import { useTableSort } from './use-table-sort.js';
import type { Column } from './table.types.js';
import type { SortBy } from '../../sorting/compare.types.js';
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
      const [sort, setSort] = useState<SortBy>([]);
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
            onSortToggle={(key, options) =>
              setSort((prev) => nextSort(prev, key, options))
            }
          />
          <output>
            {sort.length === 0
              ? 'none'
              : sort.map((r) => `${r.key}:${r.direction}`).join(',')}
          </output>
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
        sort={[{ key: 'nmae', direction: 'asc' }]}
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
        sort={[{ key: 'name', direction: 'asc' }]}
        onSortToggle={() => undefined}
      />,
    );

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('`label`'));
    warn.mockRestore();
  });

  it('announces `label` when the header is not words', async () => {
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
              label: 'Nome',
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

describe('the announcement, exactly', () => {
  it('says nothing about "more" when there is only one column', async () => {
    // MUTATION-TESTED AS MISSING: dropping the `> 1` guard let a single-column
    // table announce "Sorted by Nome, ascending. Then by 0 more." and all 25
    // tests stayed green, because every assertion on the region was a
    // substring and the snapshot is taken while it is deliberately empty.
    renderUi(<Sorted />);
    await browser.click(screen.getByRole('button', { name: /Nome/ }));

    await waitFor(() =>
      expect(status()?.textContent).toBe('Sorted by Nome, ascending.'),
    );
  });
});

describe('more than one column at a time', () => {
  const header = (name: RegExp) => screen.getByRole('button', { name });
  const cells = () =>
    screen
      .getAllByRole('row')
      .slice(1)
      .map((row) => row.querySelectorAll('td, th'))
      .map((tds) => [tds[0]?.textContent, tds[1]?.textContent].join('/'));

  /** Two people share a city, so the second rung decides their order. */
  interface Guest {
    id: string;
    city: string;
    age: number;
  }
  const guests: Guest[] = [
    { id: '1', city: 'Roma', age: 41 },
    { id: '2', city: 'Bari', age: 30 },
    { id: '3', city: 'Roma', age: 9 },
  ];
  const guestColumns: Column<Guest>[] = [
    { key: 'city', header: 'Città', rowHeader: true, sortable: true },
    { key: 'age', header: 'Età', align: 'end', sortable: true },
  ];

  function TwoRungs() {
    const sort = useTableSort(guests, { defaultSortKey: 'city' });
    return (
      <Table
        caption="Ospiti"
        rows={sort.rows}
        columns={guestColumns}
        getRowId={(g) => g.id}
        {...sort.props}
      />
    );
  }

  it('breaks the first column’s ties with the second', async () => {
    renderUi(<TwoRungs />);

    // Ordered by city alone, the two Romans are in whatever order the previous
    // pass left them — stable, and arbitrary to a reader who sees nothing on
    // screen explaining it.
    expect(cells()).toEqual(['Bari/30', 'Roma/41', 'Roma/9']);

    await browser.keyboard('{Shift>}');
    await browser.click(header(/Età/));
    await browser.keyboard('{/Shift}');

    expect(cells()).toEqual(['Bari/30', 'Roma/9', 'Roma/41']);
  });

  it('marks only the leading column with aria-sort', async () => {
    renderUi(<TwoRungs />);
    await browser.keyboard('{Shift>}');
    await browser.click(header(/Età/));
    await browser.keyboard('{/Shift}');

    const [city, age] = screen.getAllByRole('columnheader');
    // ARIA asks for one at a time: two headers both announced "sorted
    // ascending" say nothing about which of them decided the order, and the
    // rank a reader actually needs is not expressible in the attribute at all.
    expect(city).toHaveAttribute('aria-sort', 'ascending');
    // AND THE SECOND SAYS NOTHING rather than saying `none`, which this
    // assertion used to demand. ARIA defines `none` as "no defined sort applied
    // to the column" — false for a tie-break, and it sat in the same element as
    // the words "sort 2 of 2". Omitting says less and contradicts nothing.
    expect(age).not.toHaveAttribute('aria-sort');
  });

  it('says each column’s rank in words, because the attribute cannot', async () => {
    renderUi(<TwoRungs />);
    await browser.keyboard('{Shift>}');
    await browser.click(header(/Età/));
    await browser.keyboard('{/Shift}');

    // Without this the secondary column is a silent arrow: something is
    // clearly sorted, and nothing says it comes second.
    expect(header(/Città/)).toHaveAccessibleName(/sort 1 of 2/);
    expect(header(/Età/)).toHaveAccessibleName(/sort 2 of 2/);
  });

  it('says nothing about rank when there is only one', async () => {
    renderUi(<TwoRungs />);
    // A rank on a table sorted by one column is noise read out on every visit.
    expect(header(/Città/)).not.toHaveAccessibleName(/sort 1 of/);
  });

  it('announces the column that leads and how many follow', async () => {
    renderUi(<TwoRungs />);
    await browser.keyboard('{Shift>}');
    await browser.click(header(/Età/));
    await browser.keyboard('{/Shift}');

    // Four column names read on every click is a sentence nobody waits
    // through; the leading column is the fact that changes what you are
    // looking at, and the rest are tie-breaks with their rank on their header.
    // THE COLUMN THAT WAS ACTED ON, with its rank. Describing the LEADER and
    // counting the rest — what this asserted first — is silent for the
    // commonest multi-column gesture there is: reversing a secondary changes
    // neither the leader nor the count, so the sentence came out byte-identical
    // and a live region whose text does not change announces nothing.
    await waitFor(() =>
      expect(status()).toHaveTextContent(
        'Sorted by Età, ascending, sort 2 of 2.',
      ),
    );
  });

  it('speaks when a secondary column is reversed', async () => {
    renderUi(<TwoRungs />);
    await browser.keyboard('{Shift>}');
    await browser.click(header(/Età/));
    await browser.keyboard('{/Shift}');
    const before = status()?.textContent;

    await browser.keyboard('{Shift>}');
    await browser.click(header(/Età/));
    await browser.keyboard('{/Shift}');

    // Measured before the fix: every row moved and this string was identical.
    await waitFor(() => expect(status()?.textContent).not.toBe(before));
    expect(status()).toHaveTextContent(
      'Sorted by Età, descending, sort 2 of 2.',
    );
  });

  it('starts again when the modifier is not held', async () => {
    renderUi(<TwoRungs />);
    await browser.keyboard('{Shift>}');
    await browser.click(header(/Età/));
    await browser.keyboard('{/Shift}');
    expect(header(/Età/)).toHaveAccessibleName(/sort 2 of 2/);

    await browser.click(header(/Età/));
    // "Sort by age" on a table ordered by city and age is a fresh start, which
    // is what the gesture with no modifier says.
    expect(header(/Età/)).not.toHaveAccessibleName(/of 2/);
    expect(screen.getAllByRole('columnheader')[1]).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
  });

  it('reaches the same order from the keyboard', async () => {
    renderUi(<TwoRungs />);
    header(/Età/).focus();

    // ONE PATH FOR BOTH. `Enter` on a button produces a click carrying the
    // modifiers, so the pointer and the keyboard cannot drift apart — which is
    // the whole reason the component reads `shiftKey` rather than tracking a
    // modifier of its own.
    await browser.keyboard('{Shift>}{Enter}{/Shift}');

    expect(header(/Città/)).toHaveAccessibleName(/sort 1 of 2/);
    expect(header(/Età/)).toHaveAccessibleName(/sort 2 of 2/);
  });

  it('names a read-only column’s rank, because it has no control to carry it', () => {
    // MUTATION-TESTED AS MISSING: nothing rendered a sorted column that is not
    // `sortable`, so the rule the component states — "rows that arrive ordered
    // ARE ordered" — was unprotected, and multi-column sorting had already
    // broken it for every rank but the first.
    const mixed: Column<Guest>[] = [
      { key: 'city', header: 'Città', rowHeader: true, sortable: true },
      { key: 'age', header: 'Età', align: 'end' },
    ];
    renderUi(
      <Table
        caption="Ospiti"
        rows={guests}
        columns={mixed}
        getRowId={(g) => g.id}
        sort={[
          { key: 'city', direction: 'asc' },
          { key: 'age', direction: 'desc' },
        ]}
        onSortToggle={() => undefined}
      />,
    );

    const [, age] = screen.getAllByRole('columnheader');
    // No button to hide the words in, so the cell carries them — the one place
    // the rank is allowed into a header cell's name.
    expect(age).toHaveTextContent('sort 2 of 2');
  });

  it('marks a read-only LEADING column, control or no control', () => {
    const mixed: Column<Guest>[] = [
      { key: 'city', header: 'Città', rowHeader: true },
      { key: 'age', header: 'Età', align: 'end' },
    ];
    renderUi(
      <Table
        caption="Ospiti"
        rows={guests}
        columns={mixed}
        getRowId={(g) => g.id}
        sort={[{ key: 'city', direction: 'asc' }]}
        onSortToggle={() => undefined}
      />,
    );
    const [city] = screen.getAllByRole('columnheader');
    expect(city).toHaveAttribute('aria-sort', 'ascending');
  });
});

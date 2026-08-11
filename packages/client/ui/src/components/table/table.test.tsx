import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Table } from './table.component.js';
import { TableBody } from '../table-body/table-body.component.js';
import { TableCell } from '../table-cell/table-cell.component.js';
import { TableHead } from '../table-head/table-head.component.js';
import { TableHeaderCell } from '../table-header-cell/table-header-cell.component.js';
import { TableRow } from '../table-row/table-row.component.js';
import { TableFoot } from '../table-foot/table-foot.component.js';
import type { Column, TableProps, TableRowAttributes } from './table.types.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

/**
 * What has to be proved here is not that a table renders — the browser does
 * that — but that the things a hand-written table gets wrong CANNOT be wrong
 * here. Each of the first three is invisible to anyone looking at the screen.
 */
interface Person {
  id: string;
  name: string;
  age: number;
}

const people: Person[] = [
  { id: '1', name: 'Àlice', age: 34 },
  { id: '2', name: 'Bruno', age: 9 },
];

const columns: Column<Person>[] = [
  { key: 'name', header: 'Nome', rowHeader: true },
  { key: 'age', header: 'Età', align: 'end' },
];

/** The data branch of the union, for a fixture that varies one prop at a time. */
type DataProps = Extract<TableProps<Person>, { rows: readonly Person[] }>;

const basic = (props: Partial<DataProps> = {}) => (
  <Table
    caption="Persone"
    rows={people}
    columns={columns}
    getRowId={(p) => p.id}
    {...props}
  />
);

describe('Table', () => {
  it('is named by its caption', async () => {
    render(basic());

    // Assistive technology lists the tables on a page; without a name they are
    // identical entries.
    expect(screen.getByRole('table', { name: 'Persone' })).toBeInTheDocument();
  });

  it('says so when the caption is empty', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(basic({ caption: '' }));

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('renders no text'),
    );
    warn.mockRestore();
  });

  it('gives every header cell a scope, derived from where it sits', async () => {
    render(basic());

    // THE ATTRIBUTE THAT DECIDES WHETHER THE TABLE IS READABLE, and the one
    // most often missing: without it a reader landing on a cell hears "Àlice"
    // instead of "Nome: Àlice".
    expect(screen.getByRole('columnheader', { name: 'Nome' })).toHaveAttribute(
      'scope',
      'col',
    );
    expect(screen.getByRole('rowheader', { name: 'Àlice' })).toHaveAttribute(
      'scope',
      'row',
    );
  });

  it('cannot disagree between header and body', async () => {
    render(basic());

    // The invariant the column model exists for. With markup a caller can
    // write four header cells and five body cells, and every value is then
    // attributed to the wrong column — with nothing visibly wrong.
    const headerCount = screen.getAllByRole('columnheader').length;
    for (const row of screen.getAllByRole('row').slice(1)) {
      expect(row.children).toHaveLength(headerCount);
    }
  });

  it('declares the alignment once, and it reaches every cell', async () => {
    render(basic());

    expect(screen.getByRole('columnheader', { name: 'Età' })).toHaveAttribute(
      'data-align',
      'end',
    );
    for (const cell of screen.getAllByRole('cell')) {
      expect(cell).toHaveAttribute('data-align', 'end');
    }
  });

  it('reads the value off the row when the column has no cell renderer', async () => {
    render(basic());

    expect(screen.getByRole('cell', { name: '34' })).toBeInTheDocument();
  });

  it('uses the cell renderer when there is one', async () => {
    render(
      basic({
        columns: [
          { key: 'name', header: 'Nome', rowHeader: true },
          {
            key: 'label',
            header: 'Etichetta',
            cell: (p) => `${p.name} (${p.age})`,
          },
        ],
      }),
    );

    expect(
      screen.getByRole('cell', { name: 'Àlice (34)' }),
    ).toBeInTheDocument();
  });

  it('counts the empty row’s colSpan instead of trusting a number', async () => {
    render(basic({ rows: [], empty: 'Nessun risultato' }));

    // A hand-written `colSpan` is wrong the day a column is added, and a short
    // one leaves the message under one column instead of across the table.
    expect(
      screen.getByRole('cell', { name: 'Nessun risultato' }),
    ).toHaveAttribute('colspan', String(columns.length));
  });

  it('marks itself busy without hiding the rows', async () => {
    render(basic({ busy: true }));

    // `aria-busy` says "there is more coming", not "there is nothing yet" —
    // which is why the rows stay.
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');
    expect(
      screen.getByRole('rowheader', { name: 'Àlice' }),
    ).toBeInTheDocument();
  });

  it('emits no colgroup, because nothing hangs off one yet', async () => {
    const { container } = render(basic());

    // The first version shipped `<colgroup><col/><col/></colgroup>` justified as
    // "keeps a later resize from being a retrofit" — future-proofing, which
    // ADR-0016 rejects by name: an element is justified by something it does,
    // never by making a later API tidier. It comes back with `width`.
    expect(container.querySelectorAll('col')).toHaveLength(0);
  });

  it('renders the parts when it is composed instead', async () => {
    render(
      <Table caption="Persone">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Nome</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>Àlice</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    // Same scope rule, because it comes from the section rather than a prop.
    expect(screen.getByRole('columnheader', { name: 'Nome' })).toHaveAttribute(
      'scope',
      'col',
    );
    expect(screen.getByRole('cell', { name: 'Àlice' })).toBeInTheDocument();
  });

  describe('what the review found, and what now cannot happen', () => {
    it('says nothing about scope where it cannot know', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      render(
        <Table caption="Persone">
          <tfoot>
            <tr>
              <TableHeaderCell>Totale</TableHeaderCell>
            </tr>
          </tfoot>
        </Table>,
      );

      // The first version asserted `scope="row"` here. That is worse than
      // silence: with the attribute absent the browser's own algorithm gets it
      // right, so the assertion overwrote a correct answer with a wrong one and
      // left the table with no column headers at all.
      //
      // Queried by element rather than by role, deliberately: with no `scope`
      // the browser has not committed to a header role either, which is the
      // whole point — it decides, not us.
      expect(document.querySelector('tfoot th')).not.toHaveAttribute('scope');
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('no way to tell whether this heads a column'),
      );
      warn.mockRestore();
    });

    it('scopes a spanning header to its group', async () => {
      render(
        <Table caption="Persone">
          <TableHead>
            <TableRow>
              <TableHeaderCell colSpan={2}>Anagrafica</TableHeaderCell>
            </TableRow>
          </TableHead>
        </Table>,
      );

      // Plain `col` would attach the group's label to its first column only,
      // and every column under it would lose it — in the very layout the docs
      // send people to the composed parts for.
      expect(
        screen.getByRole('columnheader', { name: 'Anagrafica' }),
      ).toHaveAttribute('scope', 'colgroup');
    });

    it('gives a footer its own section, so its label heads the totals row', async () => {
      // A row with VALUES beside the label, deliberately: the first version of
      // this test used a single-cell row — the one layout where `col` and
      // `row` are indistinguishable — and pinned `col`, which points at
      // subsequent cells in the column and below a footer names nothing. The
      // label describes the totals beside it, so a reader hears "Totale: 123".
      render(
        <Table caption="Persone">
          <TableFoot>
            <TableRow>
              <TableHeaderCell>Totale</TableHeaderCell>
              <TableCell>123</TableCell>
              <TableCell>456</TableCell>
            </TableRow>
          </TableFoot>
        </Table>,
      );

      expect(screen.getByRole('rowheader', { name: 'Totale' })).toHaveAttribute(
        'scope',
        'row',
      );
    });

    it('names the table even when the caption arrives as `false`', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      // `caption={showIt && t('…')}` is the shape a real call site writes, and
      // `false` renders nothing while passing a null check.
      render(basic({ caption: false }));

      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('renders no text'),
      );
      warn.mockRestore();
    });

    it('says so when two columns share a key', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      render(
        basic({
          columns: [
            { key: 'name', header: 'Nome' },
            { key: 'name', header: 'Ancora' },
          ],
        }),
      );

      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('share a `key`'),
      );
      warn.mockRestore();
    });

    it('shows an empty state even when the caller gave none', async () => {
      render(basic({ rows: [] }));

      // Not opt-in: an empty `<tbody>` reads as "still loading" on screen, and
      // a screen reader hears "table, 2 columns, 1 row" with no hint that the
      // result set came back empty.
      expect(screen.getByRole('cell')).toHaveTextContent(/no results/i);
    });
  });

  describe('every part forwards its ref and its rest props', () => {
    // `accordion.test.tsx` records why: "Dropping `{...rest}` wholesale from a
    // part left the suite fully green: the ref rides inside it in React 19."
    const cases = [
      ['thead', TableHead],
      ['tbody', TableBody],
      ['tfoot', TableFoot],
    ] as const;

    it.each(cases)('%s', async (tag, Part) => {
      const ref = vi.fn();
      render(
        <Table caption="Persone">
          <Part ref={ref} data-probe="yes" />
        </Table>,
      );

      const node = document.querySelector(`${tag}[data-probe="yes"]`);
      expect(node).not.toBeNull();
      expect(ref).toHaveBeenCalledWith(node);
    });

    it('tr, td and th', async () => {
      const rowRef = vi.fn();
      const cellRef = vi.fn();
      const headRef = vi.fn();

      render(
        <Table caption="Persone">
          <TableBody>
            <TableRow ref={rowRef} data-probe="row">
              <TableHeaderCell ref={headRef} data-probe="th">
                Nome
              </TableHeaderCell>
              <TableCell ref={cellRef} data-probe="td">
                Àlice
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>,
      );

      expect(rowRef).toHaveBeenCalledWith(
        document.querySelector('tr[data-probe="row"]'),
      );
      expect(headRef).toHaveBeenCalledWith(
        document.querySelector('th[data-probe="th"]'),
      );
      expect(cellRef).toHaveBeenCalledWith(
        document.querySelector('td[data-probe="td"]'),
      );
    });

    it('the table itself', async () => {
      const ref = vi.fn();
      render(basic({ ref, 'data-probe': 'table' } as Partial<DataProps>));

      expect(ref).toHaveBeenCalledWith(
        document.querySelector('table[data-probe="table"]'),
      );
    });
  });

  it('has no axe violations', async () => {
    const { container } = render(basic());
    await expectNoA11yViolations(container);
  });

  it('has no axe violations when empty', async () => {
    const { container } = render(basic({ rows: [] }));
    await expectNoA11yViolations(container);
  });

  it('has no axe violations when compact, in dark', async () => {
    // The matrix `testing.md` asks for: variants × themes, not one sample.
    const { container } = renderUi(basic({ density: 'compact' }), {
      theme: 'dark',
    });
    await expectNoA11yViolations(container);
  });

  it('matches its markup', async () => {
    const { container } = render(basic());
    expect(container.firstChild).toMatchSnapshot();
  });
  describe('per-row attributes', () => {
    const rowsOf = () =>
      screen
        .getAllByRole('row')
        .filter(
          (r) => r.closest('tbody') !== null && !r.hasAttribute('hidden'),
        );

    it('puts a class and a data attribute on the row the data produced', () => {
      render(
        basic({
          getRowProps: (person) => ({
            className: person.age < 18 ? 'minor' : undefined,
            'data-age': person.age,
          }),
        }),
      );

      const [alice, bruno] = rowsOf();
      // THE GAP THIS CLOSES was named on the component's own page before it
      // existed: dropping to the parts to strike out one row costs the
      // header/body agreement, the counted colSpan and the empty state.
      expect(alice).not.toHaveClass('minor');
      expect(bruno).toHaveClass('minor');
      expect(alice).toHaveAttribute('data-age', '34');
    });

    it('passes the index, so a rule about position can be written', () => {
      render(
        basic({
          getRowProps: (_person, index) => ({
            'data-even': index % 2 === 0 ? '' : undefined,
          }),
        }),
      );

      const [first, second] = rowsOf();
      expect(first).toHaveAttribute('data-even');
      expect(second).not.toHaveAttribute('data-even');
    });

    it('cannot overwrite the selection the checkbox speaks for', () => {
      render(
        basic({
          selection: { mode: 'include', ids: new Set(['1']) },
          onRowSelectToggle: () => undefined,
          onSelectAllToggle: () => undefined,
          // A consumer claiming the opposite of the truth, on both rows.
          getRowProps: () => ({ 'data-selected': 'lie' }),
        }),
      );

      const [alice, bruno] = rowsOf();
      // THE ATTRIBUTE AND THE CHECKBOX HAVE TO AGREE, and only one of them can
      // be the source. Row 1 is selected and says so with the component's own
      // empty value; row 2 is not selected and carries nothing at all — not the
      // string that was passed in.
      expect(alice).toHaveAttribute('data-selected', '');
      expect(bruno).not.toHaveAttribute('data-selected');
    });

    it('refuses what would make the row behave', () => {
      // THE ONE GUARANTEE THAT IS TYPE-LEVEL ONLY, so `@ts-expect-error` is the
      // only thing that can assert it: every runtime check here would still
      // pass with the type widened to `ComponentProps<'tr'>`.
      //
      // Asserted on the TYPE and not through a render, which was the first
      // attempt and proved nothing — `Partial<…>` on the test's own fixture
      // loses the excess-property check, so both directives sat unused and the
      // suite reported a guarantee it had not looked at.
      //
      // A `<tr>` is not focusable, so a handler here is a control no keyboard
      // can reach; `id` and `hidden` are the component's, tying a detail row to
      // the button that controls it.
      const handler: TableRowAttributes = {
        // @ts-expect-error — a row does not take handlers.
        onClick: () => undefined,
      };
      const identity: TableRowAttributes = {
        // @ts-expect-error — `id` belongs to the component.
        id: 'mine',
      };

      expect(handler).toBeTruthy();
      expect(identity).toBeTruthy();
    });
  });
});

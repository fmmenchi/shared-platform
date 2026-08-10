import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Table } from './table.component.js';
import { TableBody } from '../table-body/table-body.component.js';
import { TableCell } from '../table-cell/table-cell.component.js';
import { TableHead } from '../table-head/table-head.component.js';
import { TableHeaderCell } from '../table-header-cell/table-header-cell.component.js';
import { TableRow } from '../table-row/table-row.component.js';
import type { Column, TableAnyProps, TableProps } from './table.types.js';
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

/**
 * The cast is the union's price, paid here rather than at the call site: a rest
 * spread of a PARTIAL union has no single object type, which is exactly the
 * friction that makes the union worth having in the public API — a caller
 * writing real JSX cannot pass `columns` and `children` together.
 */
const basic = (props: Partial<TableAnyProps<Person>> = {}) => (
  <Table
    {...({
      caption: 'Persone',
      rows: people,
      columns,
      getRowId: (p: Person) => p.id,
      ...props,
    } as TableProps<Person>)}
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
      expect.stringContaining('`caption` is empty'),
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

  it('emits one col per column, for the widths to hang off later', async () => {
    const { container } = render(basic());

    expect(container.querySelectorAll('col')).toHaveLength(columns.length);
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

  it('has no axe violations', async () => {
    const { container } = render(basic());
    await expectNoA11yViolations(container);
  });

  it('has no axe violations when empty', async () => {
    const { container } = render(
      basic({ rows: [], empty: 'Nessun risultato' }),
    );
    await expectNoA11yViolations(container);
  });
});

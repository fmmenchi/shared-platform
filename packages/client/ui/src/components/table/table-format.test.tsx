import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { Table } from './table.component.js';
import type { Column } from './table.types.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

/**
 * The column type used to refuse a date, and said why: _"there is no canonical
 * rendering of a date (which format, whose timezone?). Guessing would be a
 * design system making a product decision."_ `format` is those two answers,
 * given once for the column — and what it buys beyond a formatter call is
 * everything that follows from knowing what the value IS.
 */
interface Order {
  id: string;
  reference: string;
  placedAt: Date;
  total: number;
  discount: number;
}

const orders: Order[] = [
  {
    id: '1',
    reference: 'A-001',
    placedAt: new Date('2026-01-01T00:00:00Z'),
    total: 1234.5,
    discount: 0,
  },
  {
    id: '2',
    reference: 'A-002',
    placedAt: new Date('2026-06-15T10:30:00Z'),
    total: 0,
    discount: 0.15,
  },
];

const columns: Column<Order>[] = [
  { key: 'reference', header: 'Reference', rowHeader: true },
  {
    key: 'placedAt',
    header: 'Placed',
    format: { kind: 'date', timeZone: 'UTC' },
  },
  {
    key: 'total',
    header: 'Total',
    format: { kind: 'currency', currency: 'EUR' },
  },
  { key: 'discount', header: 'Discount', format: { kind: 'percent' } },
];

const renderTable = (locale = 'en-GB') =>
  renderUi(
    <Table
      caption="Orders"
      rows={orders}
      columns={columns}
      getRowId={(order) => order.id}
    />,
    { locale },
  );

describe('a formatted column', () => {
  it('renders a Date column, which used to take the page down', () => {
    // Measured before `RenderableKey` existed: a `Date` in a cell threw
    // "Objects are not valid as a React child". The type then excluded it, and
    // the most common column there is needed a `cell` function per table.
    renderTable();

    const placed = screen.getByText('1 Jan 2026');
    expect(placed.tagName).toBe('TIME');
    expect(placed).toHaveAttribute('datetime', '2026-01-01');
  });

  it('brings the machine-readable half into every cell', () => {
    // The half a `cell: (o) => o.placedAt.toLocaleDateString()` leaves behind —
    // and the reason anything reading the DOM rather than the pixels works: a
    // chart built from the table, a copy-to-clipboard, a test that does not
    // have to know the runtime's locale.
    renderTable();

    const total = screen.getByText('€1,234.50');
    expect(total.tagName).toBe('DATA');
    expect(total).toHaveAttribute('value', '1234.5');
  });

  it('ALIGNS FROM THE FORMAT, header included, with no align written', () => {
    // The half a formatter call cannot give you. Today a caller writes
    // `align: 'end'` beside every numeric column — one decision copied per
    // column, which the column list exists to stop.
    renderTable();

    const totalHeader = screen.getByRole('columnheader', { name: 'Total' });
    expect(totalHeader).toHaveAttribute('data-align', 'end');

    const cells = screen.getAllByRole('cell');
    const totalCell = cells.find((cell) => cell.textContent === '€1,234.50');
    expect(totalCell).toHaveAttribute('data-align', 'end');

    // A date is NOT a number: its text is words plus digits of uneven length,
    // and pushed to the end it makes a ragged left edge to scan against.
    const placedHeader = screen.getByRole('columnheader', { name: 'Placed' });
    expect(placedHeader).not.toHaveAttribute('data-align', 'end');
  });

  it('keeps a stated align, because a decision beats a derived one', () => {
    renderUi(
      <Table
        caption="Orders"
        rows={orders}
        columns={[
          { key: 'reference', header: 'Reference', rowHeader: true },
          {
            key: 'total',
            header: 'Total',
            align: 'start',
            format: { kind: 'currency', currency: 'EUR' },
          },
        ]}
        getRowId={(order) => order.id}
      />,
      { locale: 'en-GB' },
    );

    // BOTH HALVES. The header and the body cells each compute this, and a
    // heading that starts where the text starts over numbers that end where
    // the column ends is the ragged pair `align` was declared once to avoid.
    expect(screen.getByRole('columnheader', { name: 'Total' })).toHaveAttribute(
      'data-align',
      'start',
    );
    for (const cell of screen.getAllByRole('cell')) {
      expect(cell).toHaveAttribute('data-align', 'start');
    }
  });

  it('renders a zero amount and a zero percentage', () => {
    // The defect this exists to prevent, end to end: `value ? … : ''` in a cell
    // renderer turns a total of zero into an empty cell, which a reader takes
    // for missing data.
    renderTable();

    expect(screen.getByText('€0.00')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('writes every column in the reader’s language at once', () => {
    renderTable('it-IT');

    expect(screen.getByText('1 gen 2026')).toBeInTheDocument();
    // Italian declares `minimumGroupingDigits: 2`, so four digits stay plain —
    // the language's rule, not the formatter's opinion.
    expect(screen.getByText('1234,50 €')).toBeInTheDocument();
  });

  it('lets a cell function win over a format', () => {
    // A caller who wrote the function has answered the same question more
    // specifically.
    renderUi(
      <Table
        caption="Orders"
        rows={orders}
        columns={[
          { key: 'reference', header: 'Reference', rowHeader: true },
          {
            key: 'total',
            header: 'Total',
            format: { kind: 'currency', currency: 'EUR' },
            cell: (order) => (order.total === 0 ? 'free' : String(order.total)),
          },
        ]}
        getRowId={(order) => order.id}
      />,
      { locale: 'en-GB' },
    );

    expect(screen.getByText('free')).toBeInTheDocument();
    expect(screen.queryByText('€0.00')).not.toBeInTheDocument();
    // The alignment still follows the format: what the column HOLDS did not
    // change because a caller wrote the string themselves.
    expect(screen.getByRole('columnheader', { name: 'Total' })).toHaveAttribute(
      'data-align',
      'end',
    );
  });

  it('has no violations', async () => {
    const { container } = renderTable();

    await expectNoA11yViolations(container);
  });
});

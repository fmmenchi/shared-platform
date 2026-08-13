import { it, expect } from 'vitest';
import { Table } from './table.component.js';
import type { Column } from './table.types.js';

interface Row {
  id: string;
  name: string;
  placedAt: Date;
  total: number;
}

/**
 * Annotated rather than inline, because a bare array literal widens `kind` to
 * `string` and then matches no arm — the same reason the other table tests
 * declare their columns as a typed `const`.
 */
const good: Column<Row>[] = [
  { key: 'name', header: 'Name', rowHeader: true },
  { key: 'placedAt', header: 'Placed', format: { kind: 'date' } },
  {
    key: 'total',
    header: 'Total',
    format: { kind: 'currency', currency: 'EUR' },
  },
];

const shared = {
  caption: 'Orders',
  rows: [] as Row[],
  getRowId: (row: Row) => row.id,
};

/**
 * A `format` admits a key React could not render on its own — AND ONLY THE ONES
 * THAT KIND CAN READ.
 *
 * One shared key constraint admitted exactly the pairings the arm exists to
 * prevent. Measured: `{ key: 'name' /* string *\/, format: { kind: 'currency' }}`
 * typechecked and `Intl` wrote **`€NaN`** into the cell, while a `Date` with a
 * number format wrote its timestamp as a plausible-looking amount. A type that
 * admits the failure it was introduced to stop is worse than no type, because
 * it reads as a guarantee.
 */
it('types', () => {
  const ok = (
    <>
      <Table {...shared} columns={good} />
      <Table
        {...shared}
        columns={[
          // @ts-expect-error a string cannot be an amount — this wrote €NaN
          { key: 'name', header: 'Name', format: { kind: 'currency' } },
        ]}
      />
      <Table
        {...shared}
        columns={[
          // @ts-expect-error nor a count
          { key: 'name', header: 'Name', format: { kind: 'number' } },
        ]}
      />
      <Table
        {...shared}
        columns={[
          // @ts-expect-error a Date is not an amount either — it wrote its timestamp
          { key: 'placedAt', header: 'Placed', format: { kind: 'number' } },
        ]}
      />
      <Table
        {...shared}
        columns={[
          {
            key: 'placedAt',
            header: 'Placed',
            // @ts-expect-error a date kind takes the style it uses, not the other
            format: { kind: 'date', timeStyle: 'long' },
          },
        ]}
      />
      <Table
        {...shared}
        columns={[
          {
            key: 'total',
            header: 'Total',
            rowHeader: true,
            // @ts-expect-error a row header carries no format: it NAMES the
            // row, and a name is words. It also never worked — the row-header
            // branch is read first, so the value came out raw while the
            // alignment still followed the format.
            format: { kind: 'currency', currency: 'EUR' },
          },
        ]}
      />
    </>
  );
  expect(ok).toBeTruthy();
});

/** A number key still reaches every numeric kind, and a date key every date kind. */
export const kinds: Column<Row>[] = [
  { key: 'total', header: 'a', format: { kind: 'number' } },
  { key: 'total', header: 'b', format: { kind: 'integer' } },
  { key: 'total', header: 'c', format: { kind: 'percent' } },
  { key: 'total', header: 'd', format: { kind: 'currency' } },
  { key: 'placedAt', header: 'e', format: { kind: 'date' } },
  { key: 'placedAt', header: 'f', format: { kind: 'time' } },
  { key: 'placedAt', header: 'g', format: { kind: 'dateTime' } },
];

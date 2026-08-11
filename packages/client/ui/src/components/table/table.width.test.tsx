import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Table } from './table.component.js';
import type { Column } from './table.types.js';

/**
 * A declared width is a LAYOUT declaration, not a resize affordance — nothing
 * here is dragged and nothing needs a keyboard. What has to be proved is that
 * it means what it says, and that switching the table's layout algorithm to
 * make it mean that does not break the columns it did not ask about.
 */
interface Person {
  id: string;
  name: string;
  note: string;
}

const people: Person[] = [
  {
    id: '1',
    name: 'Zurigo',
    note: 'Una nota molto lunga che in layout automatico allargherebbe la colonna ben oltre quanto dichiarato',
  },
  { id: '2', name: 'Àosta', note: 'Corta' },
];

const widthOf = (name: string) =>
  screen.getByRole('columnheader', { name }).getBoundingClientRect().width;

function Sized(props: { columns: Column<Person>[]; selectable?: boolean }) {
  const selection =
    props.selectable === true
      ? {
          selection: { mode: 'include' as const, ids: new Set<string>() },
          onRowSelectToggle: () => undefined,
          onSelectAllToggle: () => undefined,
        }
      : {};

  return (
    <div style={{ inlineSize: '800px' }}>
      <Table
        caption="Persone"
        rows={people}
        columns={props.columns}
        getRowId={(p) => p.id}
        {...selection}
      />
    </div>
  );
}

describe('a declared column width', () => {
  it('holds even when the content is wider than it', async () => {
    // THE WHOLE POINT. Under the automatic algorithm a width is a suggestion
    // the browser overrides whenever content is wider — the declaration would
    // sometimes do nothing and never say so.
    render(
      <Sized
        columns={[
          { key: 'name', header: 'Nome', rowHeader: true },
          { key: 'note', header: 'Nota', width: '10rem' },
        ]}
      />,
    );

    expect(widthOf('Nota')).toBeCloseTo(160, 0);
  });

  it('switches the table to a fixed layout, derived from the columns', async () => {
    const { rerender } = render(
      <Sized columns={[{ key: 'name', header: 'Nome', rowHeader: true }]} />,
    );

    // Nothing asked, nothing changed: the automatic algorithm is what a table
    // without declared widths wants, and it stays.
    expect(getComputedStyle(screen.getByRole('table')).tableLayout).toBe(
      'auto',
    );

    rerender(
      <Sized
        columns={[
          { key: 'name', header: 'Nome', rowHeader: true, width: '10rem' },
        ]}
      />,
    );
    expect(getComputedStyle(screen.getByRole('table')).tableLayout).toBe(
      'fixed',
    );
  });

  it('leaves the columns that asked for nothing to share what is left', async () => {
    render(
      <Sized
        columns={[
          { key: 'name', header: 'Nome', rowHeader: true, width: '10rem' },
          { key: 'note', header: 'Nota' },
        ]}
      />,
    );

    // 800 total, 160 spoken for.
    expect(widthOf('Nome')).toBeCloseTo(160, 0);
    expect(widthOf('Nota')).toBeCloseTo(640, 0);
  });

  it('does not collapse the checkbox column when the layout changes under it', async () => {
    // THE TRAP THIS PROP CANNOT BE ADDED WITHOUT. The selection column is
    // sized `1%`, which the AUTOMATIC algorithm reads as "as narrow as the
    // content allows" and the FIXED one reads literally — 1% of an 800px table
    // is 8px, and the checkbox is 18.
    render(
      <Sized
        selectable
        columns={[
          { key: 'name', header: 'Nome', rowHeader: true, width: '10rem' },
          { key: 'note', header: 'Nota' },
        ]}
      />,
    );

    // A ROW's box, not the header's — the header's lives in a `<th>`.
    const boxes = screen.getAllByRole('checkbox');
    const box = boxes[boxes.length - 1] as HTMLElement;
    const cell = box.closest('td') as HTMLElement;
    expect(cell.getBoundingClientRect().width).toBeGreaterThan(
      box.getBoundingClientRect().width,
    );
  });

  it('is declared once, on the header, not repeated on every cell', async () => {
    // Under `fixed` the first row decides every column, so a width written on
    // the body cells too would be the same decision copied N times — the thing
    // the column model exists to prevent.
    render(
      <Sized
        columns={[
          { key: 'name', header: 'Nome', rowHeader: true },
          { key: 'note', header: 'Nota', width: '10rem' },
        ]}
      />,
    );

    const bodyCells = document.querySelectorAll('tbody td');
    for (const cell of bodyCells) {
      expect(cell.getAttribute('style')).toBeNull();
    }
  });
});

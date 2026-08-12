import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useColumnOrder, moveColumn } from './use-column-order.js';
import type { Column } from './table.types.js';
import type { ColumnOrder } from './use-column-order.types.js';

interface Person {
  id: string;
  name: string;
  city: string;
  age: number;
  // Columns are keyed against the row, so a fixture that adds a column has to
  // add the field it reads.
  note?: string;
  flag?: string;
}

const columns: Column<Person>[] = [
  { key: 'name', header: 'Nome', rowHeader: true },
  { key: 'city', header: 'Città' },
  { key: 'age', header: 'Età', align: 'end' },
];

function Harness(
  props: Omit<Parameters<typeof useColumnOrder<Person>>[0], 'columns'> & {
    columns?: Column<Person>[];
  },
) {
  const { columns: given = columns, ...rest } = props;
  const order = useColumnOrder<Person>({ columns: given, ...rest });
  return (
    <>
      {['name', 'city', 'age'].map((key) => (
        <button key={key} type="button" onClick={() => order.move(key, -1)}>
          {`${key}<`}
        </button>
      ))}
      {['name', 'city', 'age'].map((key) => (
        <button
          key={`r-${key}`}
          type="button"
          onClick={() => order.move(key, 1)}
        >
          {`${key}>`}
        </button>
      ))}
      <button type="button" onClick={order.reset}>
        reset
      </button>
      <output data-testid="order">
        {order.columns.map((c) => c.key).join(',')}
      </output>
      <output data-testid="pos">{order.positionOf('city')}</output>
      <output data-testid="ends">
        {`${order.canMove('name', -1)}/${order.canMove('age', 1)}`}
      </output>
    </>
  );
}

const shown = () => screen.getByTestId('order').textContent;
const click = (name: string) => screen.getByRole('button', { name });

describe('moveColumn', () => {
  const order: ColumnOrder = ['name', 'city', 'age'];

  it('moves one and closes the gap behind it', () => {
    expect(moveColumn(order, 'age', -1)).toEqual(['name', 'age', 'city']);
    expect(moveColumn(order, 'name', 1)).toEqual(['city', 'name', 'age']);
  });

  it('is clamped at both ends rather than wrapped', () => {
    // Wrapping would send the first column to the end, which is a different
    // thing from what the reader asked — and, on a held key, an endless ride.
    expect(moveColumn(order, 'name', -1)).toEqual(order);
    expect(moveColumn(order, 'age', 1)).toEqual(order);
  });

  it('does nothing on a delta of zero, and jumps on a bigger one', () => {
    expect(moveColumn(order, 'city', 0)).toEqual(order);
    expect(moveColumn(order, 'name', 2)).toEqual(['city', 'age', 'name']);
    // Past the end is still refused, whatever the size of the step.
    expect(moveColumn(order, 'city', 2)).toEqual(order);
  });

  it('leaves a key it does not know alone', () => {
    // Appending it would invent a position for a column that may simply have
    // been renamed.
    expect(moveColumn(order, 'nope', -1)).toEqual(order);
  });
});

describe('useColumnOrder', () => {
  it('starts in the declared order', () => {
    render(<Harness />);
    expect(shown()).toBe('name,city,age');
  });

  it('moves a column and reports where it now sits', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(click('city<'));
    expect(shown()).toBe('city,name,age');
    expect(screen.getByTestId('pos').textContent).toBe('1');
  });

  it('says when a move would go nowhere', () => {
    render(<Harness />);
    expect(screen.getByTestId('ends').textContent).toBe('false/false');
  });

  it('goes back to the declared order', async () => {
    const user = userEvent.setup();
    render(<Harness defaultOrder={['age', 'city', 'name']} />);

    expect(shown()).toBe('age,city,name');
    await user.click(click('reset'));
    expect(shown()).toBe('name,city,age');
  });

  it('applies two moves in one tick, not just the last', async () => {
    // THE UPDATER. Both dispatches read the same closure otherwise, and a
    // reader holding the key down produces exactly that.
    const user = userEvent.setup();
    function Double() {
      const order = useColumnOrder<Person>({ columns });
      return (
        <>
          <button
            type="button"
            onClick={() => {
              order.move('age', -1);
              order.move('age', -1);
            }}
          >
            twice
          </button>
          <output data-testid="order">
            {order.columns.map((c) => c.key).join(',')}
          </output>
        </>
      );
    }
    render(<Double />);

    await user.click(click('twice'));
    expect(shown()).toBe('age,name,city');
  });

  describe('a stored order that has outlived the columns', () => {
    it('drops a key the columns no longer have', () => {
      render(<Harness defaultOrder={['age', 'gone', 'name', 'city']} />);
      expect(shown()).toBe('age,name,city');
    });

    it('puts a column it never knew about where it was DECLARED', () => {
      // Appending would put a column added between two others after the ones
      // its author meant it to precede.
      const withNote: Column<Person>[] = [
        { key: 'name', header: 'Nome', rowHeader: true },
        { key: 'note', header: 'Note' },
        { key: 'city', header: 'Città' },
        { key: 'age', header: 'Età' },
      ];
      render(
        <Harness columns={withNote} defaultOrder={['age', 'name', 'city']} />,
      );
      // `note` follows `name`, as declared — not tacked onto the end.
      expect(shown()).toBe('age,name,note,city');
    });

    it('ignores a key that appears twice', () => {
      // FOUND BY PRESSING ON IT: a stored order is a value that has been
      // through storage, a URL or somebody's merge, and `['name','name','city']`
      // drew the same column TWICE — with the same React key, which is its own
      // kind of wrong.
      render(<Harness defaultOrder={['name', 'name', 'city']} />);
      expect(shown()).toBe('name,city,age');
    });

    it('lands a new column after its declared predecessor, not at the end', () => {
      // AND THE TWO ARE NOT THE SAME THING once the reader has moved something,
      // which the documentation used to blur. Declared `name, city, note`, with
      // the reader having put `city` first: `note` follows `city`. Adjacency is
      // what an author expresses by putting one column beside another, and a
      // position index means nothing once the row it counted along has been
      // rearranged.
      const withNote: Column<Person>[] = [
        { key: 'name', header: 'Nome', rowHeader: true },
        { key: 'city', header: 'Città' },
        { key: 'note', header: 'Note' },
      ];
      render(<Harness columns={withNote} defaultOrder={['city', 'name']} />);
      expect(shown()).toBe('city,note,name');
    });

    it('puts a new FIRST column first', () => {
      const withId: Column<Person>[] = [
        { key: 'flag', header: 'Flag' },
        { key: 'name', header: 'Nome', rowHeader: true },
        { key: 'city', header: 'Città' },
      ];
      render(<Harness columns={withId} defaultOrder={['city', 'name']} />);
      // Nothing declared before it, so it goes to the front.
      expect(shown()).toBe('flag,city,name');
    });

    it('keeps working when the stored order knows nothing at all', () => {
      render(<Harness defaultOrder={['gone', 'also-gone']} />);
      expect(shown()).toBe('name,city,age');
    });
  });

  describe('controlled', () => {
    it('reports the intent and never moves on its own', async () => {
      const user = userEvent.setup();
      const onOrderChange = vi.fn();
      render(
        <Harness
          order={['name', 'city', 'age']}
          onOrderChange={onOrderChange}
        />,
      );

      await user.click(click('age<'));
      expect(onOrderChange).toHaveBeenCalledWith(['name', 'age', 'city']);
      expect(shown()).toBe('name,city,age');
    });

    it('stays controlled when the value it is handed is `undefined`', async () => {
      // The shape a round-trip through storage produces, and the correction
      // every hook in this family has needed: read as a VALUE it would mean
      // uncontrolled, and the hook would keep its own copy and stop reporting.
      const user = userEvent.setup();
      const onOrderChange = vi.fn();
      render(<Harness order={undefined} onOrderChange={onOrderChange} />);

      await user.click(click('age<'));
      expect(onOrderChange).toHaveBeenCalledTimes(1);
      expect(shown()).toBe('name,city,age');
    });

    it('follows the value it is given back', async () => {
      function Held() {
        const [order, setOrder] = useState<ColumnOrder>([
          'name',
          'city',
          'age',
        ]);
        return <Harness order={order} onOrderChange={setOrder} />;
      }
      const user = userEvent.setup();
      render(<Held />);

      await user.click(click('age<'));
      expect(shown()).toBe('name,age,city');
    });

    it('warns when it is given a value it can never change', () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      render(<Harness order={['age', 'name', 'city']} />);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('useColumnOrder'),
      );
      warn.mockRestore();
    });
  });
});

import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRowSelection } from './use-row-selection.js';
import { EVERYTHING_SELECTED } from '../../selection/selection.js';
import type { Selection } from '../../selection/selection.types.js';
import type { UseRowSelectionOptions } from './use-row-selection.types.js';

/**
 * The pair and the two intents, tested WITHOUT a table. The algebra itself is
 * proved in `selection/selection.test.ts`; what is proved here is the wiring —
 * which intent produces which edit, and what the hook reports about rows it
 * cannot see.
 */
interface Row {
  id: string;
}

const rows: Row[] = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

function Harness(props: Omit<UseRowSelectionOptions<Row>, 'getRowId'>) {
  const selection = useRowSelection(rows, { getRowId: (r) => r.id, ...props });
  return (
    <>
      <button
        type="button"
        onClick={() => selection.props.onRowSelectToggle('a')}
      >
        row a
      </button>
      <button type="button" onClick={() => selection.props.onSelectAllToggle()}>
        all
      </button>
      <output data-mode="">{selection.state.mode}</output>
      <output data-ids="">{[...selection.state.ids].sort().join(',')}</output>
      <output data-count="">{String(selection.count)}</output>
      <output data-coverage="">{selection.coverage}</output>
    </>
  );
}

const read = (what: string) =>
  document.querySelector(`[data-${what}]`)?.textContent ?? '';

describe('useRowSelection, holding the selection itself', () => {
  it('starts empty, picks one row, and reports what it knows', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(read('count')).toBe('0');
    expect(read('coverage')).toBe('none');

    await user.click(screen.getByRole('button', { name: 'row a' }));
    expect(read('ids')).toBe('a');
    expect(read('count')).toBe('1');
    expect(read('coverage')).toBe('some');
  });

  it('takes the whole page, then gives it back', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const all = screen.getByRole('button', { name: 'all' });

    await user.click(all);
    expect(read('coverage')).toBe('all');
    expect(read('count')).toBe('3');

    await user.click(all);
    expect(read('coverage')).toBe('none');
    expect(read('count')).toBe('0');
  });

  it('completes a partial page rather than emptying it', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'row a' }));
    await user.click(screen.getByRole('button', { name: 'all' }));
    // A reader clicking a half-filled box is finishing it.
    expect(read('coverage')).toBe('all');
  });

  it('refuses to count rows it has never seen', async () => {
    // `EVERYTHING_SELECTED` covers a result set this client holds three rows
    // of. `count` is `rows.length` minus the exceptions here, because that is
    // all this side can honestly subtract from — the total belongs to whoever
    // ran the query, and a wrong number is what turns "delete 3" into ten
    // thousand deletions.
    render(<Harness defaultSelection={EVERYTHING_SELECTED} />);
    expect(read('mode')).toBe('exclude');
    expect(read('coverage')).toBe('all');
  });
});

describe('useRowSelection, when the consumer holds it', () => {
  it('reports the intent and never selects on its own', async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(
      <Harness
        selection={{ mode: 'include', ids: new Set() }}
        onSelectionChange={onSelectionChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'row a' }));
    expect(onSelectionChange).toHaveBeenCalledWith({
      mode: 'include',
      ids: new Set(['a']),
    });
    // The parent owns it: nothing moved here.
    expect(read('ids')).toBe('');
  });

  it('treats a passed `undefined` as controlled-and-empty, not as uncontrolled', async () => {
    // The same correction `useSortState` needed. A consumer clearing a
    // selection hands back whatever their store calls empty, and read as a
    // VALUE that would mean "uncontrolled" — after which the hook serves a
    // stale copy of its own.
    function Store() {
      const [selection, setSelection] = useState<Selection | undefined>(
        undefined,
      );
      return <Harness selection={selection} onSelectionChange={setSelection} />;
    }

    const user = userEvent.setup();
    render(<Store />);

    await user.click(screen.getByRole('button', { name: 'row a' }));
    expect(read('ids')).toBe('a');
    await user.click(screen.getByRole('button', { name: 'row a' }));
    expect(read('ids')).toBe('');
  });

  it('says so when the selection is passed in with no setter', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<Harness selection={{ mode: 'include', ids: new Set() }} />);

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('`selection` is passed but `onSelectionChange`'),
    );
    warn.mockRestore();
  });
});

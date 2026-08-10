import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRowSelection } from './use-row-selection.js';
import {
  EVERYTHING_SELECTED,
  NOTHING_SELECTED,
} from '../../selection/selection.js';
import type { Selection } from '../../selection/selection.types.js';
import type { UseRowSelectionOptions } from './use-row-selection.types.js';

/**
 * The pair and the two intents, tested WITHOUT a table. The algebra itself is
 * proved in `selection/selection.test.ts`; what is proved here is the wiring —
 * which intent produces which edit, what the hook reports about rows it cannot
 * see, and that two edits in one tick both land.
 */
const page = ['a', 'b', 'c'];

function Harness(props: UseRowSelectionOptions) {
  const selection = useRowSelection(props);
  return (
    <>
      <button
        type="button"
        onClick={() => selection.props.onRowSelectToggle('a')}
      >
        row a
      </button>
      <button
        type="button"
        onClick={() => {
          selection.props.onRowSelectToggle('a');
          selection.props.onRowSelectToggle('b');
        }}
      >
        rows a and b
      </button>
      <button
        type="button"
        onClick={() => selection.props.onSelectAllToggle(page)}
      >
        all
      </button>
      <button
        type="button"
        onClick={() => selection.setSelection(EVERYTHING_SELECTED)}
      >
        everything
      </button>
      <output data-mode="">{selection.state.mode}</output>
      <output data-ids="">{[...selection.state.ids].sort().join(',')}</output>
      <output data-count="">{String(selection.count)}</output>
    </>
  );
}

const read = (what: string) =>
  document.querySelector(`[data-${what}]`)?.textContent ?? '';

describe('useRowSelection, holding the selection itself', () => {
  it('starts empty and picks one row', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(read('count')).toBe('0');
    await user.click(screen.getByRole('button', { name: 'row a' }));
    expect(read('ids')).toBe('a');
    expect(read('count')).toBe('1');
  });

  it('lands BOTH edits when two rows are toggled in one tick', async () => {
    // Written as `setState(toggleRow(state, id))`, both calls computed from the
    // same render value and the first one vanished — measured, one row selected
    // out of two. The updater form is what makes a range selection, or any
    // consumer loop, possible at all.
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'rows a and b' }));
    expect(read('ids')).toBe('a,b');
  });

  it('takes the page, then gives it back', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const all = screen.getByRole('button', { name: 'all' });

    await user.click(all);
    expect(read('ids')).toBe('a,b,c');
    await user.click(all);
    expect(read('ids')).toBe('');
  });

  it('clears an everything-rule whole instead of narrowing it', async () => {
    // The data-loss path: narrowing left the UI showing nothing selected while
    // the rule still covered every row the client had never received.
    const user = userEvent.setup();
    render(<Harness defaultSelection={EVERYTHING_SELECTED} />);

    await user.click(screen.getByRole('button', { name: 'all' }));
    expect(read('mode')).toBe('include');
    expect(read('ids')).toBe('');
    expect(read('count')).toBe('0');
  });
});

describe('useRowSelection and the count', () => {
  it('refuses to answer for rows it has never seen', async () => {
    // THE TEST THAT WAS MISSING. Its predecessor asserted `mode` and coverage
    // and never touched `count` — so it passed against an implementation that
    // handed the page size to `countSelected` and reported "3" for a rule
    // covering ten thousand rows.
    render(<Harness defaultSelection={EVERYTHING_SELECTED} />);
    expect(read('count')).toBe('undefined');
  });

  it('answers when the consumer supplies the result set’s size', async () => {
    render(<Harness defaultSelection={EVERYTHING_SELECTED} total={10_000} />);
    expect(read('count')).toBe('10000');
  });

  it('sets the whole rule at once', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'everything' }));
    expect(read('mode')).toBe('exclude');
    // A range selection or a restore is ONE edit, not a loop of intents.
    expect(read('count')).toBe('undefined');
  });
});

describe('useRowSelection and the bar', () => {
  // Tested here rather than through `TableSelectionBar`: `barProps` is hook
  // logic, and it shipped with its two escalations exercised by nothing.
  function BarHarness(props: UseRowSelectionOptions) {
    const selection = useRowSelection(props);
    return (
      <>
        <button
          type="button"
          onClick={() => selection.barProps.onSelectEverything()}
        >
          everything
        </button>
        <button type="button" onClick={() => selection.barProps.onClear()}>
          clear
        </button>
        <output data-mode="">{selection.barProps.selection.mode}</output>
        <output data-ids="">
          {[...selection.barProps.selection.ids].sort().join(',')}
        </output>
        <output data-count="">{String(selection.barProps.total)}</output>
      </>
    );
  }

  it('escalates to a rule covering rows nobody here has seen', async () => {
    const user = userEvent.setup();
    render(
      <BarHarness
        defaultSelection={{ mode: 'include', ids: new Set(['a']) }}
        total={10_000}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'everything' }));
    expect(read('mode')).toBe('exclude');
    expect(read('ids')).toBe('');
  });

  it('clears back to nothing', async () => {
    const user = userEvent.setup();
    render(<BarHarness defaultSelection={EVERYTHING_SELECTED} />);

    await user.click(screen.getByRole('button', { name: 'clear' }));
    expect(read('mode')).toBe('include');
    expect(read('ids')).toBe('');
  });

  it('reports both escalations to a consumer holding the state', async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(
      <BarHarness
        selection={{ mode: 'include', ids: new Set() }}
        onSelectionChange={onSelectionChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'everything' }));
    expect(onSelectionChange).toHaveBeenLastCalledWith(EVERYTHING_SELECTED);
    await user.click(screen.getByRole('button', { name: 'clear' }));
    expect(onSelectionChange).toHaveBeenLastCalledWith(NOTHING_SELECTED);
  });

  it('carries the total rather than a count, so one number cannot outrank the other', async () => {
    // It handed over both, and the bar's label came from one while its effect
    // came from the other: measured, an offer reading "Select all 7" that
    // selected 2,450.
    render(<BarHarness total={2450} />);
    expect(read('count')).toBe('2450');
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

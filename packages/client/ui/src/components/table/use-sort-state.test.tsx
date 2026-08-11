import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useSortState, nextSort } from './use-sort-state.js';
import type { SortState } from '../../sorting/compare.types.js';
import type { UseSortStateOptions } from './use-sort-state.types.js';

/**
 * The state and the cycle, tested WITHOUT a table.
 *
 * That is not tidiness. Every one of these cases was reachable through
 * `<Table>` and none of them was covered there, because a rendered table
 * exercises one shape of state — the one the fixture happened to use — and
 * hides the rest behind markup assertions. The defects below were all found by
 * asking the hook directly.
 */
function Harness(props: UseSortStateOptions & { keys?: string[] }) {
  const { keys = ['name'], ...options } = props;
  const sort = useSortState(options);
  return (
    <>
      {keys.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => sort.props.onSortToggle(key)}
        >
          {key}
        </button>
      ))}
      <output>{JSON.stringify(sort.state)}</output>
    </>
  );
}

const state = () => document.querySelector('output')?.textContent;

describe('nextSort', () => {
  it('walks asc → desc → none, and starts over on another column', () => {
    // THREE STOPS, NOT TWO. A two-state toggle leaves no way back to the order
    // the data arrived in — the only order that carries meaning in a table of
    // events or a ranking the server chose.
    expect(nextSort(null, 'name')).toEqual({ key: 'name', direction: 'asc' });
    expect(nextSort({ key: 'name', direction: 'asc' }, 'name')).toEqual({
      key: 'name',
      direction: 'desc',
    });
    expect(nextSort({ key: 'name', direction: 'desc' }, 'name')).toBeNull();
    expect(nextSort({ key: 'name', direction: 'desc' }, 'age')).toEqual({
      key: 'age',
      direction: 'asc',
    });
  });
});

describe('useSortState, holding the state itself', () => {
  it('seeds from defaultSortKey and walks the cycle', async () => {
    const user = userEvent.setup();
    render(<Harness defaultSortKey="name" />);

    expect(state()).toBe('{"key":"name","direction":"asc"}');
    await user.click(screen.getByRole('button', { name: 'name' }));
    expect(state()).toBe('{"key":"name","direction":"desc"}');
    await user.click(screen.getByRole('button', { name: 'name' }));
    expect(state()).toBe('null');
  });

  it('honours an explicit `defaultSort: null` over the shorthand', () => {
    // `??` could not tell "not passed" from "passed as null", so the shorthand
    // silently won and the table started sorted against an explicit request not
    // to be. Presence of the key is the question, not the value behind it.
    render(<Harness defaultSort={null} defaultSortKey="name" />);
    expect(state()).toBe('null');
  });
});

describe('useSortState, when the consumer holds it', () => {
  it('treats `sort={undefined}` as controlled-and-unsorted, not as uncontrolled', async () => {
    // THE SHAPE A URL ROUND-TRIP PRODUCES. `null` is a legal state here — it is
    // the third stop — and a consumer storing it in a search param hands back
    // `undefined` for "no sort". Read as a VALUE that means uncontrolled, the
    // hook served the last value it had recorded while it still owned the
    // state: a fossil from before the consumer took over. Measured, the third
    // click left the consumer at `null` and the hook claiming ascending, so the
    // header announced a sort over rows in arrival order.
    function UrlLike() {
      const [sort, setSort] = useState<SortState | undefined>(undefined);
      return (
        <Harness
          sort={sort}
          onSortChange={(next) => setSort(next ?? undefined)}
        />
      );
    }

    const user = userEvent.setup();
    render(<UrlLike />);
    const toggle = screen.getByRole('button', { name: 'name' });

    await user.click(toggle);
    expect(state()).toBe('{"key":"name","direction":"asc"}');
    await user.click(toggle);
    expect(state()).toBe('{"key":"name","direction":"desc"}');
    await user.click(toggle);
    // The stop the reader asked for, and no fossil underneath it.
    expect(state()).toBe('null');
  });

  it('says so when the state is passed in and no setter with it', () => {
    // Headers that do nothing, forever — the shape reached by lifting the state
    // into a URL param and forgetting the setter. `useControlled` cannot warn:
    // it only knows about FLIPPING between the two modes.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<Harness sort={{ key: 'name', direction: 'asc' }} />);

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('`sort` is passed but `onSortChange` is not'),
    );
    warn.mockRestore();
  });

  it('reports the intent and never moves on its own', async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    render(<Harness sort={null} onSortChange={onSortChange} />);

    await user.click(screen.getByRole('button', { name: 'name' }));
    expect(onSortChange).toHaveBeenCalledWith({
      key: 'name',
      direction: 'asc',
    });
    // The parent owns it: nothing changed here.
    expect(state()).toBe('null');
  });
});

import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useSortState, nextSort } from './use-sort-state.js';
import type { SortBy } from '../../sorting/compare.types.js';
import type { UseSortStateOptions } from './use-sort-state.types.js';

function Harness(props: UseSortStateOptions & { keys?: string[] }) {
  const { keys = ['name'], ...options } = props;
  const sort = useSortState(options);
  return (
    <>
      {keys.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => sort.props.onSortToggle(key, { additive: false })}
        >
          {key}
        </button>
      ))}
      {keys.map((key) => (
        <button
          key={`add-${key}`}
          type="button"
          onClick={() => sort.props.onSortToggle(key, { additive: true })}
        >
          {`+${key}`}
        </button>
      ))}
      <output>{JSON.stringify(sort.state)}</output>
    </>
  );
}

const state = () => document.querySelector('output')?.textContent;
const asc = (key: string) => ({ key, direction: 'asc' as const });
const desc = (key: string) => ({ key, direction: 'desc' as const });

describe('nextSort', () => {
  it('walks asc → desc → none, and starts over on another column', () => {
    // THREE STOPS, NOT TWO. A two-state toggle leaves no way back to the order
    // the data arrived in — the only order that carries meaning in a table of
    // events or a ranking the server chose.
    expect(nextSort([], 'name')).toEqual([asc('name')]);
    expect(nextSort([asc('name')], 'name')).toEqual([desc('name')]);
    expect(nextSort([desc('name')], 'name')).toEqual([]);
    expect(nextSort([desc('name')], 'age')).toEqual([asc('age')]);
  });

  it('replaces the whole order when the gesture carries no modifier', () => {
    // "Sort by city" on a table ordered by name and age is a fresh start, which
    // is what a plain activation says. Cycling in place would make the third
    // click on a secondary column delete a rank the reader never chose.
    expect(nextSort([asc('name'), desc('age')], 'city')).toEqual([asc('city')]);
    expect(nextSort([asc('name'), desc('age')], 'name')).toEqual([asc('name')]);
  });

  describe('additive', () => {
    const additive = { additive: true };

    it('appends a column at the end of the order', () => {
      expect(nextSort([asc('name')], 'age', additive)).toEqual([
        asc('name'),
        asc('age'),
      ]);
    });

    it('cycles a rank IN PLACE rather than moving it', () => {
      // Reversing a column is not re-choosing it. A rank that jumped to the end
      // on every reversal would make the order impossible to hold in your head.
      expect(nextSort([asc('name'), asc('age')], 'name', additive)).toEqual([
        desc('name'),
        asc('age'),
      ]);
    });

    it('lets a column leave by the same gesture that added it', () => {
      // The third rung is still "off", which is what makes the additive case
      // reachable in both directions: a reader who added one by mistake gets
      // out without hunting for a reset.
      expect(nextSort([asc('name'), desc('age')], 'age', additive)).toEqual([
        asc('name'),
      ]);
    });

    it('is the same on an empty order as a plain activation', () => {
      expect(nextSort([], 'name', additive)).toEqual([asc('name')]);
    });
  });
});

describe('useSortState, holding the state itself', () => {
  it('seeds from defaultSortKey and walks the cycle', async () => {
    const user = userEvent.setup();
    render(<Harness defaultSortKey="name" />);

    expect(state()).toBe('[{"key":"name","direction":"asc"}]');
    await user.click(screen.getByRole('button', { name: 'name' }));
    expect(state()).toBe('[{"key":"name","direction":"desc"}]');
    await user.click(screen.getByRole('button', { name: 'name' }));
    expect(state()).toBe('[]');
  });

  it('builds an order of two and takes one back out', async () => {
    const user = userEvent.setup();
    render(<Harness defaultSortKey="name" keys={['name', 'age']} />);

    await user.click(screen.getByRole('button', { name: '+age' }));
    expect(state()).toBe(
      '[{"key":"name","direction":"asc"},{"key":"age","direction":"asc"}]',
    );

    await user.click(screen.getByRole('button', { name: '+age' }));
    await user.click(screen.getByRole('button', { name: '+age' }));
    expect(state()).toBe('[{"key":"name","direction":"asc"}]');
  });

  it('honours an explicit empty `defaultSort` over the shorthand', () => {
    // `??` could not tell "not passed" from "passed as empty", so the shorthand
    // silently won and the table started sorted against an explicit request not
    // to be. Presence of the key is the question, not the value behind it.
    render(<Harness defaultSort={[]} defaultSortKey="name" />);
    expect(state()).toBe('[]');
  });
});

describe('useSortState, when the consumer holds it', () => {
  it('treats `sort={undefined}` as controlled-and-unsorted, not as uncontrolled', async () => {
    // THE SHAPE A URL ROUND-TRIP PRODUCES. An empty order is a legal state — it
    // is the third stop — and a consumer storing it in a search param hands
    // back `undefined` for "no sort". Read as a VALUE that means uncontrolled,
    // the hook served the last value it had recorded while it still owned the
    // state: a fossil from before the consumer took over. Measured, the third
    // click left the consumer empty and the hook claiming ascending, so the
    // header announced a sort over rows in arrival order.
    function UrlLike() {
      const [sort, setSort] = useState<SortBy | undefined>(undefined);
      return (
        <Harness
          sort={sort}
          onSortChange={(next) => setSort(next.length === 0 ? undefined : next)}
        />
      );
    }

    const user = userEvent.setup();
    render(<UrlLike />);
    const toggle = screen.getByRole('button', { name: 'name' });

    await user.click(toggle);
    expect(state()).toBe('[{"key":"name","direction":"asc"}]');
    await user.click(toggle);
    expect(state()).toBe('[{"key":"name","direction":"desc"}]');
    await user.click(toggle);
    // The stop the reader asked for, and no fossil underneath it.
    expect(state()).toBe('[]');
  });

  it('says so when the state is passed in and no setter with it', () => {
    // Headers that do nothing, forever — the shape reached by lifting the state
    // into a URL param and forgetting the setter. `useControlled` cannot warn:
    // it only knows about FLIPPING between the two modes.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<Harness sort={[asc('name')]} />);

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('`sort` is passed but `onSortChange` is not'),
    );
    warn.mockRestore();
  });

  it('reports the intent and never moves on its own', async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    render(<Harness sort={[]} onSortChange={onSortChange} />);

    await user.click(screen.getByRole('button', { name: 'name' }));
    expect(onSortChange).toHaveBeenCalledWith([asc('name')]);
    // Nothing moved on its own: the value it was given still governs.
    expect(state()).toBe('[]');
  });
});

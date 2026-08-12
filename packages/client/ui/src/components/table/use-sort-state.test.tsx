import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
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

  it('replaces the order — unless the column already leads it', () => {
    // "Sort by city" on a table ordered by name and age is a fresh start, which
    // is what a plain activation says.
    expect(nextSort([asc('name'), desc('age')], 'city')).toEqual([asc('city')]);

    // BUT ACTIVATING THE LEADER IS A REVERSAL, not a new choice — and this
    // assertion used to demand the opposite, which is how the defect survived
    // review: it asked for `[asc('name')]`, meaning the reader clicked the
    // header they were already sorted by and nothing they could see changed.
    // Three clicks to reach "off", two of them showing ascending.
    expect(nextSort([asc('name'), desc('age')], 'name')).toEqual([
      desc('name'),
    ]);
    expect(nextSort([desc('name'), asc('age')], 'name')).toEqual([]);

    // A column in the order but NOT leading it is still a fresh start.
    expect(nextSort([asc('name'), desc('age')], 'age')).toEqual([asc('age')]);
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
    render(<Harness defaultSortKey="name" />);

    expect(state()).toBe('[{"key":"name","direction":"asc"}]');
    await browser.click(screen.getByRole('button', { name: 'name' }));
    expect(state()).toBe('[{"key":"name","direction":"desc"}]');
    await browser.click(screen.getByRole('button', { name: 'name' }));
    expect(state()).toBe('[]');
  });

  it('builds an order of two and takes one back out', async () => {
    render(<Harness defaultSortKey="name" keys={['name', 'age']} />);

    await browser.click(screen.getByRole('button', { name: '+age' }));
    expect(state()).toBe(
      '[{"key":"name","direction":"asc"},{"key":"age","direction":"asc"}]',
    );

    await browser.click(screen.getByRole('button', { name: '+age' }));
    await browser.click(screen.getByRole('button', { name: '+age' }));
    expect(state()).toBe('[{"key":"name","direction":"asc"}]');
  });

  it('honours an explicit empty `defaultSort` over the shorthand', () => {
    // Presence of the KEY is the question, not the value behind it.
    render(<Harness defaultSort={[]} defaultSortKey="name" />);
    expect(state()).toBe('[]');
  });

  it('reads the seed by presence, which an empty list cannot prove', () => {
    // THE ASSERTION ABOVE CANNOT FAIL, and its comment used to claim it could:
    // `[] ?? x` is `[]` and `[] || x` is `[]`, so the very shape it blamed
    // passes it. Mutation-tested — replacing the presence check with a value
    // check left every test in this file green.
    //
    // `undefined` is the value that separates them, and it is the shape a
    // conditional spread produces: `{...(saved && { defaultSort: saved })}`
    // passes the key with nothing behind it, and the shorthand must not then
    // sneak the table into a sorted state nobody asked for.
    render(<Harness defaultSort={undefined} defaultSortKey="name" />);
    expect(state()).toBe('[]');
  });

  it('applies two toggles in one tick, not just the last', async () => {
    // THE UPDATER, which nothing pinned: mutation-tested, replacing
    // `setState((previous) => …)` with `setState(nextSort(state, …))` left all
    // 37 tests in this file and the sorting suite green. Two dispatches in one
    // batch both read the same closure, so the second overwrites the first and
    // the second click of a double-click does nothing.
    function Double() {
      const sort = useSortState({ defaultSortKey: 'name' });
      return (
        <>
          <button
            type="button"
            onClick={() => {
              sort.props.onSortToggle('name', { additive: false });
              sort.props.onSortToggle('name', { additive: false });
            }}
          >
            twice
          </button>
          <output>{JSON.stringify(sort.state)}</output>
        </>
      );
    }
    render(<Double />);

    await browser.click(screen.getByRole('button', { name: 'twice' }));
    // asc → desc → off. Read from the closure both times it would be `desc`.
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

    render(<UrlLike />);
    const toggle = screen.getByRole('button', { name: 'name' });

    await browser.click(toggle);
    expect(state()).toBe('[{"key":"name","direction":"asc"}]');
    await browser.click(toggle);
    expect(state()).toBe('[{"key":"name","direction":"desc"}]');
    await browser.click(toggle);
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
    const onSortChange = vi.fn();
    render(<Harness sort={[]} onSortChange={onSortChange} />);

    await browser.click(screen.getByRole('button', { name: 'name' }));
    expect(onSortChange).toHaveBeenCalledWith([asc('name')]);
    // Nothing moved on its own: the value it was given still governs.
    expect(state()).toBe('[]');
  });
});

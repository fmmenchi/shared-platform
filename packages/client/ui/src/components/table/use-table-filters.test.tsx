import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useTableFilters } from './use-table-filters.js';
import { renderUi } from '../../test/render.js';
import type { UseTableFiltersOptions } from './use-table-filters.types.js';

/**
 * The wiring, tested WITHOUT a table: which intent produces which edit, what
 * the hook forwards to the matcher, and what it refuses to do quietly. The
 * matching itself is proved in `filtering/filter.test.ts`.
 */
interface City {
  id: string;
  name: string;
}

const cities: City[] = [
  { id: '1', name: 'Àosta' },
  { id: '2', name: 'Milano' },
  { id: '3', name: 'İzmir' },
];

function Filtered(props: { options?: UseTableFiltersOptions<City> }) {
  const filters = useTableFilters(cities, props.options);
  return (
    <>
      <button
        type="button"
        onClick={() => filters.props.onFilterApply('name', 'a')}
      >
        apply a
      </button>
      <button
        type="button"
        onClick={() => filters.props.onFilterApply('name', '')}
      >
        clear name
      </button>
      <button type="button" onClick={() => filters.props.onClearFilters()}>
        clear all
      </button>
      <output data-rows="">{filters.rows.map((c) => c.name).join(',')}</output>
      <output data-keys="">
        {Object.keys(filters.state).sort().join(',')}
      </output>
      <output data-active="">{filters.active.join(',')}</output>
      <output data-count="">{String(filters.toolbarProps.rowCount)}</output>
    </>
  );
}

const read = (what: string) =>
  document.querySelector(`[data-${what}]`)?.textContent ?? '';

describe('useTableFilters', () => {
  it('hands back the caller’s rows until something is in force', () => {
    render(<Filtered />);
    expect(read('rows')).toBe('Àosta,Milano,İzmir');
    expect(read('count')).toBe('3');
  });

  it('matches without caring about accents', async () => {
    const user = userEvent.setup();
    render(<Filtered />);

    await user.click(screen.getByRole('button', { name: 'apply a' }));
    // "Àosta" and "Milano" both contain an unaccented "a"; `includes` would
    // have dropped the first, which is the whole reason the matching is ours.
    expect(read('rows')).toBe('Àosta,Milano');
  });

  it('folds case in the READER’s language, not the runtime’s', async () => {
    // THE ASSERTION THAT DISCRIMINATES. The first version applied "a" under a
    // Turkish locale and expected the same two rows the default locale gives —
    // an assertion that passes with no locale, with English, and with a fold
    // that ignores the locale entirely, because `İzmir` contains no "a". The
    // letter that separates them is "i": `'İ'.toLowerCase()` produces an `i`
    // followed by a combining dot, a different string, while the Turkish
    // mapping produces the plain letter.
    renderUi(<Filtered options={{ defaultFilters: { name: 'i' } }} />, {
      locale: 'tr',
    });

    expect(read('rows')).toContain('İzmir');
  });

  it('removes the key when a filter is cleared, rather than leaving it empty', async () => {
    // This object is a query key: `{ name: '' }` and `{}` are two cache
    // entries for one view.
    const user = userEvent.setup();
    render(<Filtered />);

    await user.click(screen.getByRole('button', { name: 'apply a' }));
    expect(read('keys')).toBe('name');

    await user.click(screen.getByRole('button', { name: 'clear name' }));
    expect(read('keys')).toBe('');
    expect(read('active')).toBe('');
    expect(read('rows')).toBe('Àosta,Milano,İzmir');
  });

  it('lets a column say what its own value means', async () => {
    const user = userEvent.setup();
    render(
      <Filtered
        options={{
          filter: { name: (row, value) => row.name.length > value.length },
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'apply a' }));
    // Every name is longer than one character, so the predicate keeps them all
    // — which "contains an a" would not have.
    expect(read('rows')).toBe('Àosta,Milano,İzmir');
  });

  it('does not false-warn about a value the row exposes through its prototype', async () => {
    // `Object.hasOwn` misses an inherited getter, so the hook warned about a
    // key it was filtering by perfectly well — and it probed only the first
    // rows, so a property that appears later warned too.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    class Row {
      constructor(public id: string) {}
      get name(): string {
        return 'Milano';
      }
    }
    function Inherited() {
      const filters = useTableFilters([new Row('1')] as unknown as City[], {
        defaultFilters: { name: 'mi' },
      });
      return <output data-rows="">{filters.rows.length}</output>;
    }

    render(<Inherited />);
    expect(read('rows')).toBe('1');
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('says so when the filtered key names neither a property nor a predicate', async () => {
    // It empties the table silently otherwise: the default reads `row[key]`,
    // finds nothing, and treats an empty cell as no match — so the rows vanish
    // and the summary blames a column nobody can see.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<Filtered options={{ defaultFilters: { fullName: 'a' } }} />);

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('`fullName`'));
    expect(read('rows')).toBe('');
    warn.mockRestore();
  });

  it('says so when the filters are passed in with no setter', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<Filtered options={{ filters: { name: 'a' } }} />);

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('`filters` is passed but `onFiltersChange`'),
    );
    warn.mockRestore();
  });

  it('clears everything at once', async () => {
    const user = userEvent.setup();
    render(<Filtered options={{ defaultFilters: { name: 'a' } }} />);

    expect(read('rows')).toBe('Àosta,Milano');
    await user.click(screen.getByRole('button', { name: 'clear all' }));
    expect(read('rows')).toBe('Àosta,Milano,İzmir');
    expect(read('keys')).toBe('');
  });
});

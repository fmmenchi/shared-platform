import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { useTableSort } from './use-table-sort.js';
import { renderUi } from '../../test/render.js';
import type { UseTableSortOptions } from './use-table-sort.types.js';

/**
 * The engine's wiring, tested WITHOUT a table: what the hook forwards, what it
 * hands back, and what it refuses to do quietly.
 */
interface City {
  id: string;
  name: string;
}

const cities: City[] = [
  { id: '1', name: 'Zebra' },
  { id: '2', name: 'Ökland' },
  { id: '3', name: 'Aalborg' },
];

function Ordered(props: {
  rows?: readonly City[];
  options?: UseTableSortOptions<City>;
}) {
  const rows = props.rows ?? cities;
  const sort = useTableSort(rows, {
    defaultSortKey: 'name',
    ...props.options,
  });
  return (
    <>
      <output data-order="">{sort.rows.map((c) => c.name).join(',')}</output>
      <output data-same="">{String(sort.rows === rows)}</output>
    </>
  );
}

const readOrder = () =>
  document.querySelector('[data-order]')?.textContent ?? '';

describe('useTableSort and the locale', () => {
  it('collates by the injected locale, not by the host default', () => {
    // THE TEST THE FIRST VERSION DID NOT HAVE. Ordering "Àosta" before "Zurigo"
    // passes byte-identically whether or not the locale is forwarded, because
    // every default already handles accents — so it proved accent-awareness and
    // not the wiring. Swedish is the discriminator: `Ö` is its own letter,
    // AFTER `Z`, where English files it next to `O`.
    renderUi(<Ordered />, { locale: 'sv-SE' });
    expect(readOrder()).toBe('Aalborg,Zebra,Ökland');
  });

  it('collates the same rows differently for a different reader', () => {
    renderUi(<Ordered />, { locale: 'en-US' });
    expect(readOrder()).toBe('Aalborg,Ökland,Zebra');
  });

  it('falls back to a FIXED tag outside a provider, not the runtime default', () => {
    // Asking `Intl` for the host default is Node's ICU on the server and the
    // browser's on the client, so the same rows are emitted in one order and
    // hydrated in another — a mismatch whose symptom is row order. The fallback
    // is the package's own locale, so both runtimes agree.
    render(<Ordered />);
    expect(readOrder()).toBe('Aalborg,Ökland,Zebra');
  });
});

describe('useTableSort and the rows it is given', () => {
  it('hands back the caller’s own array on the unsorted stop, read-only', () => {
    // Identity is the point: no copy is made when nothing is ordered, so the
    // type must forbid `rows.sort()` — which would reorder the consumer's state
    // in place on that one stop, and throw outright on a frozen array.
    render(<Ordered options={{ defaultSort: [] }} />);
    expect(document.querySelector('[data-same]')).toHaveTextContent('true');
  });

  it('says so when the sorted key names neither a property nor a comparator', () => {
    // A COMPUTED column marked `sortable`. The engine reads `row[key]`, which is
    // `undefined` on every row, which it reads as empty on both sides, which
    // reports every pair equal — so the rows do not move while the header
    // announces that they did, in either direction. It is the exact failure the
    // component's own doc says it prevents.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<Ordered options={{ defaultSortKey: 'fullName' }} />);

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('`fullName`'));
    expect(readOrder()).toBe('Zebra,Ökland,Aalborg');
    warn.mockRestore();
  });

  it('says so when a `compare` key is a typo', () => {
    // `Record<string, …>` is an index signature, so excess-property checking
    // never fires and the typo compiles. It then falls through to alphabetical,
    // which for a priority column looks plausible enough to ship.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(
      <Ordered
        options={{
          defaultSortKey: 'nmae',
          compare: { name: (a, b) => a.name.localeCompare(b.name) },
        }}
      />,
    );

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('`nmae`'));
    warn.mockRestore();
  });

  it('stays quiet when the rows expose the key through a prototype getter', () => {
    // A class instance sorts perfectly well — `byKey` reads `row[key]`, which
    // walks the prototype — and was being warned about: the probe asked with
    // `Object.hasOwn`, which the filter probe had already corrected to `in`
    // for exactly this shape. One question, two answers, one already known
    // wrong. A false warning teaches people to ignore the true ones.
    class Star {
      constructor(
        public id: string,
        private called: string,
      ) {}
      get name(): string {
        return this.called;
      }
    }
    const stars = [new Star('1', 'Vega'), new Star('2', 'Altair')];

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    function Getters() {
      const sort = useTableSort<Star>(stars, { defaultSortKey: 'name' });
      return (
        <output data-order="">{sort.rows.map((s) => s.name).join(',')}</output>
      );
    }
    render(<Getters />);

    expect(readOrder()).toBe('Altair,Vega');
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('stays quiet when the property only appears in later rows', () => {
    // Sparse data: the first rows carry no `age` and a later one does. The old
    // probe looked at the first five rows only, so a real, sortable property
    // was reported as naming nothing — the second correction the filter probe
    // already documents, applied here.
    const sparse = [
      { id: '1', name: 'a' },
      { id: '2', name: 'b' },
      { id: '3', name: 'c' },
      { id: '4', name: 'd' },
      { id: '5', name: 'e' },
      { id: '6', name: 'f', age: 9 },
    ];

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    function Sparse() {
      const sort = useTableSort(sparse, { defaultSortKey: 'age' });
      return (
        <output data-order="">{sort.rows.map((r) => r.id).join(',')}</output>
      );
    }
    render(<Sparse />);

    // The one row with a value leads; the empties keep their arrival order.
    expect(readOrder()).toBe('6,1,2,3,4,5');
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('stays quiet when the comparator is the one thing that knows the column', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(
      <Ordered
        options={{
          defaultSortKey: 'fullName',
          compare: { fullName: (a, b) => a.name.localeCompare(b.name) },
        }}
      />,
    );

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

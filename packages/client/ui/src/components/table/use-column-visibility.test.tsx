import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { useColumnVisibility } from './use-column-visibility.js';
import type { Column } from './table.types.js';
import type {
  HiddenColumns,
  UseColumnVisibilityOptions,
} from './use-column-visibility.types.js';

interface Person {
  id: string;
  name: string;
  city: string;
  age: number;
}

const columns: Column<Person>[] = [
  { key: 'name', header: 'Nome', rowHeader: true },
  { key: 'city', header: 'Città' },
  { key: 'age', header: 'Età', align: 'end' },
];

/**
 * The state, asked directly — the shape a rendered table would only exercise
 * through whatever its fixture happened to hide.
 */
function Harness(props: Omit<UseColumnVisibilityOptions<Person>, 'columns'>) {
  const visibility = useColumnVisibility({ columns, ...props });
  return (
    <>
      <button type="button" onClick={() => visibility.toggle('city')}>
        città
      </button>
      <button type="button" onClick={() => visibility.toggle('age')}>
        età
      </button>
      <button type="button" onClick={() => visibility.toggle('name')}>
        nome
      </button>
      <button type="button" onClick={visibility.showAll}>
        mostra tutto
      </button>
      <output data-testid="visible">
        {visibility.columns.map((c) => c.key).join(',')}
      </output>
      <output data-testid="canHide">
        {['name', 'city', 'age'].filter((k) => visibility.canHide(k)).join(',')}
      </output>
    </>
  );
}

const visible = () => screen.getByTestId('visible').textContent;
const hideable = () => screen.getByTestId('canHide').textContent;

describe('useColumnVisibility', () => {
  it('hands back the columns to render, in order', () => {
    render(<Harness />);
    expect(visible()).toBe('name,city,age');
  });

  it('puts a column away and brings it back', async () => {
    render(<Harness />);

    await browser.click(screen.getByRole('button', { name: 'città' }));
    // WHICH IS WHY `Table` NEEDS NO PROP: it is handed fewer columns and draws
    // fewer columns. It never learns that one was put away.
    expect(visible()).toBe('name,age');

    await browser.click(screen.getByRole('button', { name: 'città' }));
    expect(visible()).toBe('name,city,age');
  });

  it('refuses to hide the column that names the rows', async () => {
    render(<Harness />);

    expect(hideable()).toBe('city,age');

    await browser.click(screen.getByRole('button', { name: 'nome' }));
    // THE TABLE WOULD STILL RENDER, which is what makes this worth refusing in
    // code rather than in a guideline: hide the row header and a screen reader
    // announces every cell as "column 3, 47", with nothing on screen to say
    // anything went wrong.
    expect(visible()).toBe('name,city,age');
  });

  it('refuses to hide the last one standing, with no row header to lean on', async () => {
    // THE TEST BELOW REFUSED NOTHING, and mutation testing said so: deleting
    // the floor entirely left every suite green. Its fixture's only
    // non-row-header columns are `city` and `age`, so the state it walks to is
    // held by the ROW HEADER rule — the floor was never reached. It is only
    // reachable when no column is `rowHeader`, which nothing constructed.
    function Plain() {
      const visibility = useColumnVisibility({
        columns: [
          { key: 'city', header: 'Città' },
          { key: 'age', header: 'Età' },
        ] as Column<Person>[],
      });
      return (
        <>
          <button type="button" onClick={() => visibility.toggle('city')}>
            città
          </button>
          <button type="button" onClick={() => visibility.toggle('age')}>
            età
          </button>
          <output data-testid="visible">
            {visibility.columns.map((c) => c.key).join(',')}
          </output>
          <output data-testid="canHide">
            {['city', 'age'].filter((k) => visibility.canHide(k)).join(',')}
          </output>
        </>
      );
    }

    render(<Plain />);

    await browser.click(screen.getByRole('button', { name: 'città' }));
    expect(visible()).toBe('age');
    // `age` is now the only thing to look at, and a caption over an empty grid
    // reads as broken rather than chosen.
    expect(hideable()).toBe('city');

    await browser.click(screen.getByRole('button', { name: 'età' }));
    expect(visible()).toBe('age');
  });

  it('refuses to hide the last one standing', async () => {
    render(<Harness defaultHidden={new Set(['city'])} />);

    expect(visible()).toBe('name,age');
    // `name` is the row header and refuses anyway; `age` is the last that could
    // go, and the floor is one.
    expect(hideable()).toBe('city,age');

    await browser.click(screen.getByRole('button', { name: 'età' }));
    expect(visible()).toBe('name');
    // BOTH ARE STILL TOGGLEABLE, and that is the floor working rather than
    // failing: they are hidden, so the question being asked of them is whether
    // they may come BACK — which is always yes. The floor only ever refuses a
    // departure, and the only column left to depart is the row header, which
    // refuses for its own reason.
    expect(hideable()).toBe('city,age');
  });

  it('shows everything again', async () => {
    render(<Harness defaultHidden={new Set(['city', 'age'])} />);

    expect(visible()).toBe('name');
    await browser.click(screen.getByRole('button', { name: 'mostra tutto' }));
    expect(visible()).toBe('name,city,age');
  });

  describe('controlled', () => {
    function Controlled() {
      const [hidden, setHidden] = useState<HiddenColumns>(new Set(['age']));
      return <Harness hidden={hidden} onHiddenChange={setHidden} />;
    }

    it('reports the intent and follows the value it is given back', async () => {
      render(<Controlled />);

      expect(visible()).toBe('name,city');
      await browser.click(screen.getByRole('button', { name: 'città' }));
      expect(visible()).toBe('name');
    });

    it('stays controlled when the value it is handed is `undefined`', async () => {
      // THE ASSERTION BELOW CANNOT SEE THIS: it passes `new Set()`, which is not
      // `undefined`, so a value check behaves identically — mutation-tested,
      // swapping `'hidden' in options` for `hidden !== undefined` left it
      // green. `undefined` is the shape a round-trip through storage produces,
      // and reading it as UNCONTROLLED makes the hook keep its own copy and
      // stop reporting.
      const onHiddenChange = vi.fn();
      render(<Harness hidden={undefined} onHiddenChange={onHiddenChange} />);

      await browser.click(screen.getByRole('button', { name: 'città' }));
      expect(onHiddenChange).toHaveBeenCalledTimes(1);
      expect(visible()).toBe('name,city,age');
    });

    it('is controlled by PRESENCE, so an empty set is not uncontrolled', async () => {
      const onHiddenChange = vi.fn();
      // The correction the other four table hooks each needed: a consumer
      // round-tripping "nothing hidden" through storage hands back an empty
      // set, and reading the VALUE would silently switch them to uncontrolled —
      // the hook would then keep its own copy and stop reporting.
      render(<Harness hidden={new Set()} onHiddenChange={onHiddenChange} />);

      await browser.click(screen.getByRole('button', { name: 'città' }));
      expect(onHiddenChange).toHaveBeenCalledTimes(1);
      // Nothing moved on its own: the value it was given still governs.
      expect(visible()).toBe('name,city,age');
    });

    it('warns when it is given a value it can never change', () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      render(<Harness hidden={new Set(['city'])} />);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('useColumnVisibility'),
      );
      warn.mockRestore();
    });
  });
});

import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'città' }));
    // WHICH IS WHY `Table` NEEDS NO PROP: it is handed fewer columns and draws
    // fewer columns. It never learns that one was put away.
    expect(visible()).toBe('name,age');

    await user.click(screen.getByRole('button', { name: 'città' }));
    expect(visible()).toBe('name,city,age');
  });

  it('refuses to hide the column that names the rows', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(hideable()).toBe('city,age');

    await user.click(screen.getByRole('button', { name: 'nome' }));
    // THE TABLE WOULD STILL RENDER, which is what makes this worth refusing in
    // code rather than in a guideline: hide the row header and a screen reader
    // announces every cell as "column 3, 47", with nothing on screen to say
    // anything went wrong.
    expect(visible()).toBe('name,city,age');
  });

  it('refuses to hide the last one standing', async () => {
    const user = userEvent.setup();
    render(<Harness defaultHidden={new Set(['city'])} />);

    expect(visible()).toBe('name,age');
    // `name` is the row header and refuses anyway; `age` is the last that could
    // go, and the floor is one.
    expect(hideable()).toBe('city,age');

    await user.click(screen.getByRole('button', { name: 'età' }));
    expect(visible()).toBe('name');
    // BOTH ARE STILL TOGGLEABLE, and that is the floor working rather than
    // failing: they are hidden, so the question being asked of them is whether
    // they may come BACK — which is always yes. The floor only ever refuses a
    // departure, and the only column left to depart is the row header, which
    // refuses for its own reason.
    expect(hideable()).toBe('city,age');
  });

  it('shows everything again', async () => {
    const user = userEvent.setup();
    render(<Harness defaultHidden={new Set(['city', 'age'])} />);

    expect(visible()).toBe('name');
    await user.click(screen.getByRole('button', { name: 'mostra tutto' }));
    expect(visible()).toBe('name,city,age');
  });

  describe('controlled', () => {
    function Controlled() {
      const [hidden, setHidden] = useState<HiddenColumns>(new Set(['age']));
      return <Harness hidden={hidden} onHiddenChange={setHidden} />;
    }

    it('reports the intent and follows the value it is given back', async () => {
      const user = userEvent.setup();
      render(<Controlled />);

      expect(visible()).toBe('name,city');
      await user.click(screen.getByRole('button', { name: 'città' }));
      expect(visible()).toBe('name');
    });

    it('is controlled by PRESENCE, so an empty set is not uncontrolled', async () => {
      const user = userEvent.setup();
      const onHiddenChange = vi.fn();
      // The correction the other four table hooks each needed: a consumer
      // round-tripping "nothing hidden" through storage hands back an empty
      // set, and reading the VALUE would silently switch them to uncontrolled —
      // the hook would then keep its own copy and stop reporting.
      render(<Harness hidden={new Set()} onHiddenChange={onHiddenChange} />);

      await user.click(screen.getByRole('button', { name: 'città' }));
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

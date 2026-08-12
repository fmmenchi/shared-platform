import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { useControlled } from './use-controlled.js';

function Toggle(props: {
  value?: boolean;
  defaultValue?: boolean;
  onChange?: (v: boolean) => void;
}) {
  const [on, setOn] = useControlled({ ...props, name: 'Toggle' });
  return (
    <button type="button" onClick={() => setOn(!on)}>
      {on ? 'on' : 'off'}
    </button>
  );
}

describe('useControlled', () => {
  it('uncontrolled: starts from defaultValue and updates internally', async () => {
    render(<Toggle defaultValue={false} />);
    const btn = screen.getByRole('button');

    expect(btn).toHaveTextContent('off');
    await browser.click(btn);
    expect(btn).toHaveTextContent('on');
  });

  it('controlled: reflects the value, does not self-update, but calls onChange', async () => {
    const onChange = vi.fn();
    render(<Toggle value={false} onChange={onChange} />);
    const btn = screen.getByRole('button');

    expect(btn).toHaveTextContent('off');
    await browser.click(btn);
    expect(btn).toHaveTextContent('off'); // stays — the parent owns the value
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('composes two updates in one tick instead of losing the first', async () => {
    // The defect this form exists for. Written as `setValue(next(current))`,
    // both calls compute from the render value and the FIRST one vanishes —
    // measured on row selection, where toggling two rows from one handler left
    // one selected. Uncontrolled we are the only writer, so the last value we
    // produced is the base, whether or not React has re-rendered with it.
    function Counter() {
      const [n, setN] = useControlled({ defaultValue: 0, name: 'Counter' });
      return (
        <button
          type="button"
          onClick={() => {
            setN((previous) => previous + 1);
            setN((previous) => previous + 1);
          }}
        >
          {n}
        </button>
      );
    }

    render(<Counter />);
    const btn = screen.getByRole('button');

    await browser.click(btn);
    expect(btn).toHaveTextContent('2');
  });

  it('tells onChange the same value it puts in state', async () => {
    const onChange = vi.fn();
    function Counter() {
      const [n, setN] = useControlled({
        defaultValue: 0,
        onChange,
        name: 'Counter',
      });
      return (
        <button
          type="button"
          onClick={() => {
            setN((previous) => previous + 1);
            setN((previous) => previous + 1);
          }}
        >
          {n}
        </button>
      );
    }

    render(<Counter />);
    await browser.click(screen.getByRole('button'));

    // Not two calls both reporting 1: the notification and the state cannot
    // disagree, or a consumer mirroring it into their own store drifts.
    expect(onChange.mock.calls).toEqual([[1], [2]]);
  });

  it('composes two updates in one tick when CONTROLLED too', async () => {
    // The half the first version left out. `useFilterState` calls the
    // controlled path its primary one — filters belong in a URL — and there two
    // applies in one tick both computed from the value the parent had last
    // rendered, so the first was lost. A consumer cannot fix it from outside:
    // `onChange` hands them a computed value, not an updater.
    function Counter() {
      const [n, setN] = useState(0);
      const [value, setValue] = useControlled({
        value: n,
        onChange: setN,
        name: 'Counter',
      });
      return (
        <button
          type="button"
          onClick={() => {
            setValue((previous) => previous + 1);
            setValue((previous) => previous + 1);
          }}
        >
          {value}
        </button>
      );
    }

    render(<Counter />);
    const btn = screen.getByRole('button');

    await browser.click(btn);
    expect(btn).toHaveTextContent('2');
  });

  it('drops its shadow when the parent commits a different value', async () => {
    // What makes the shadow safe while controlled: it remembers the rendered
    // value it was computed from, so a parent that moves the value out from
    // under it is believed rather than overruled.
    function Counter() {
      const [n, setN] = useState(0);
      const [value, setValue] = useControlled({
        value: n,
        onChange: setN,
        name: 'Counter',
      });
      return (
        <>
          <button type="button" onClick={() => setValue((p) => p + 1)}>
            {value}
          </button>
          <button type="button" onClick={() => setN(100)}>
            reset
          </button>
        </>
      );
    }

    render(<Counter />);
    const [inc, reset] = screen.getAllByRole('button');

    await browser.click(inc as HTMLElement);
    expect(inc).toHaveTextContent('1');
    await browser.click(reset as HTMLElement);
    await browser.click(inc as HTMLElement);
    expect(screen.getAllByRole('button')[0]).toHaveTextContent('101');
  });

  it('warns when switching controlled/uncontrolled', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { rerender } = render(<Toggle defaultValue={false} />);
    rerender(<Toggle value={true} />);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});

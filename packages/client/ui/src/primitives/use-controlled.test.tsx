import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    const user = userEvent.setup();
    render(<Toggle defaultValue={false} />);
    const btn = screen.getByRole('button');

    expect(btn).toHaveTextContent('off');
    await user.click(btn);
    expect(btn).toHaveTextContent('on');
  });

  it('controlled: reflects the value, does not self-update, but calls onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Toggle value={false} onChange={onChange} />);
    const btn = screen.getByRole('button');

    expect(btn).toHaveTextContent('off');
    await user.click(btn);
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

    const user = userEvent.setup();
    render(<Counter />);
    const btn = screen.getByRole('button');

    await user.click(btn);
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

    const user = userEvent.setup();
    render(<Counter />);
    await user.click(screen.getByRole('button'));

    // Not two calls both reporting 1: the notification and the state cannot
    // disagree, or a consumer mirroring it into their own store drifts.
    expect(onChange.mock.calls).toEqual([[1], [2]]);
  });

  it('warns when switching controlled/uncontrolled', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { rerender } = render(<Toggle defaultValue={false} />);
    rerender(<Toggle value={true} />);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});

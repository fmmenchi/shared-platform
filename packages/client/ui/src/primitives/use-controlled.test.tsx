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

  it('warns when switching controlled/uncontrolled', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { rerender } = render(<Toggle defaultValue={false} />);
    rerender(<Toggle value={true} />);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});

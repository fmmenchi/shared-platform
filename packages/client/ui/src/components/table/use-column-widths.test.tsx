import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { useColumnWidths } from './use-column-widths.js';
import type {
  ColumnWidths,
  UseColumnWidthsOptions,
} from './use-column-widths.types.js';

/**
 * The state, asked directly. It was the only one of the four table hooks with
 * no test of its own — noticed by a review rather than by the suite, which is
 * the point: a rendered table exercises the one shape its fixture happened to
 * use and hides the rest behind markup assertions.
 */
function Harness(props: UseColumnWidthsOptions) {
  const widths = useColumnWidths(props);
  return (
    <>
      <button
        type="button"
        onClick={() => widths.props.onColumnResize('name', '240px')}
      >
        wider
      </button>
      <button
        type="button"
        onClick={() => widths.props.onColumnResize('name', '')}
      >
        restore
      </button>
      <button type="button" onClick={() => widths.setWidths({ age: '6ch' })}>
        preset
      </button>
      <button type="button" onClick={() => widths.resetWidths()}>
        reset
      </button>
      <output>{JSON.stringify(widths.state)}</output>
    </>
  );
}

const state = () => document.querySelector('output')?.textContent;
const press = (name: string) =>
  browser.click(screen.getByRole('button', { name }));

describe('useColumnWidths', () => {
  it('starts with nothing resized', async () => {
    render(<Harness />);

    expect(state()).toBe('{}');
  });

  it('records a width, and drops the key when it is given back', async () => {
    render(<Harness />);

    await press('wider');
    expect(state()).toBe('{"name":"240px"}');

    // AN EMPTY WIDTH IS NOT A WIDTH OF ZERO — it is "no override", so the key
    // LEAVES. It matters beyond tidiness: this object is persisted, and
    // `{ name: '' }` and `{}` would be two stored layouts describing one table.
    await press('restore');
    expect(state()).toBe('{}');
  });

  it('is controlled by the presence of `widths`, not by its value', async () => {
    const onWidthsChange = vi.fn();
    // `undefined` here is controlled-and-empty, not uncontrolled — the shape a
    // consumer round-tripping a layout through storage hands back, and the
    // correction each of the four state hooks needed.
    render(<Harness widths={undefined} onWidthsChange={onWidthsChange} />);

    await press('wider');
    expect(onWidthsChange).toHaveBeenCalledWith({ name: '240px' });
    // Nothing moved on its own: the caller holds it.
    expect(state()).toBe('{}');
  });

  it('lets the caller hold it', async () => {
    function Controlled() {
      const [widths, setWidths] = useState<ColumnWidths>({ name: '100px' });
      return <Harness widths={widths} onWidthsChange={setWidths} />;
    }
    render(<Controlled />);

    expect(state()).toBe('{"name":"100px"}');
    await press('wider');
    expect(state()).toBe('{"name":"240px"}');
  });

  it('seeds from `defaultWidths` and then owns it', async () => {
    render(<Harness defaultWidths={{ name: '100px', age: '6ch' }} />);

    expect(state()).toBe('{"name":"100px","age":"6ch"}');
    await press('wider');
    expect(state()).toBe('{"name":"240px","age":"6ch"}');
  });

  it('takes a whole layout at once, and gives it all back', async () => {
    render(<Harness defaultWidths={{ name: '100px' }} />);

    await press('preset');
    expect(state()).toBe('{"age":"6ch"}');

    await press('reset');
    // Back to the widths the COLUMNS declare, which is why this is a delete
    // rather than a stored value: the columns already hold them.
    expect(state()).toBe('{}');
  });

  it('warns when it is controlled with nothing listening', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<Harness widths={{ name: '100px' }} />);

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('`onWidthsChange`'),
    );
    warn.mockRestore();
  });

  it('does not report a width change nobody made', async () => {
    const onWidthsChange = vi.fn();
    render(
      <Harness
        defaultWidths={{ name: '100px' }}
        onWidthsChange={onWidthsChange}
      />,
    );

    expect(onWidthsChange).not.toHaveBeenCalled();
  });
});

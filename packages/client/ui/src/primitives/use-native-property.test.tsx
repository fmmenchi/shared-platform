import { describe, it, expect } from 'vitest';
import { useRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { useNativeProperty } from './use-native-property.js';

/** A bare host so the hook is tested on its own, not through a component. */
function Host(props: { value?: string; initial?: string }) {
  const el = useRef<HTMLInputElement>(null);
  useNativeProperty(el, 'value', {
    value: props.value,
    initial: props.initial,
  });
  return <input aria-label="t" ref={el} />;
}

describe('useNativeProperty', () => {
  const field = () =>
    screen.getByRole<HTMLInputElement>('textbox', { name: 't' });

  it('writes a driven value, and rewrites it when it changes', async () => {
    function Wrapper() {
      const [v, setV] = useState('a');
      return (
        <>
          <Host value={v} />
          <button type="button" onClick={() => setV('b')}>
            next
          </button>
        </>
      );
    }
    render(<Wrapper />);
    expect(field().value).toBe('a');
    await browser.click(screen.getByRole('button', { name: 'next' }));
    expect(field().value).toBe('b');
  });

  it('writes an initial value once, then leaves the element alone', async () => {
    render(<Host initial="a" />);
    await browser.type(field(), 'b');
    expect(field().value).toBe('ab');
  });

  it('ignores `initial` when a driven value is given', () => {
    render(<Host value="driven" initial="ignored" />);
    expect(field().value).toBe('driven');
  });

  it('writes nothing at all when neither is given', async () => {
    render(<Host />);
    await browser.type(field(), 'typed');
    expect(field().value).toBe('typed');
  });

  it('is a PUSH, not a mirror — an unchanged value does not overwrite an edit', async () => {
    function Wrapper() {
      const [, force] = useState(0);
      return (
        <>
          <Host value="a" />
          <button type="button" onClick={() => force((n) => n + 1)}>
            rerender
          </button>
        </>
      );
    }
    render(<Wrapper />);
    await browser.type(field(), 'z');
    await browser.click(screen.getByRole('button', { name: 'rerender' }));
    expect(field().value).toBe('az');
  });
});

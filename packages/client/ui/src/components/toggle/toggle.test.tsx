import type { FormEvent } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toggle } from './toggle.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

describe('Toggle', () => {
  it('is a button that carries its state, not a checkbox or a switch', () => {
    render(<Toggle>Bold</Toggle>);

    // The boundary this component draws (ADR-0024), asserted rather than
    // described: a toggle announces "button, pressed". If either of the other
    // two roles ever appears here, the wrong one of the three was shipped.
    const toggle = screen.getByRole('button', { name: 'Bold' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('flips on a press and back, uncontrolled', async () => {
    const user = userEvent.setup();
    const onPressedChange = vi.fn();
    render(<Toggle onPressedChange={onPressedChange}>Bold</Toggle>);
    const toggle = screen.getByRole('button', { name: 'Bold' });

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(onPressedChange).toHaveBeenLastCalledWith(true);

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(onPressedChange).toHaveBeenLastCalledWith(false);
  });

  it('starts pressed when asked to', () => {
    render(<Toggle defaultPressed>Bold</Toggle>);
    expect(screen.getByRole('button', { name: 'Bold' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('answers to the keyboard, which is where a toggle is used', async () => {
    const user = userEvent.setup();
    render(<Toggle>Bold</Toggle>);
    const toggle = screen.getByRole('button', { name: 'Bold' });

    // Both keys, because a `<button>` answers to both and a hand-rolled
    // toggle built on a div is the thing that only ever answers to one.
    await user.tab();
    expect(toggle).toHaveFocus();
    await user.keyboard(' ');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await user.keyboard('{Enter}');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  it('lets the prop win when the state is controlled', async () => {
    const user = userEvent.setup();
    const onPressedChange = vi.fn();
    const { rerender } = render(
      <Toggle pressed={false} onPressedChange={onPressedChange}>
        Bold
      </Toggle>,
    );
    const toggle = screen.getByRole('button', { name: 'Bold' });

    // Asked for, not taken: the press reports and the attribute stands still
    // until the consumer's own state comes back round.
    await user.click(toggle);
    expect(onPressedChange).toHaveBeenCalledWith(true);
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    rerender(
      <Toggle pressed onPressedChange={onPressedChange}>
        Bold
      </Toggle>,
    );
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls the press off when the click handler prevents it', async () => {
    const user = userEvent.setup();
    const onPressedChange = vi.fn();
    render(
      <Toggle
        onClick={(event) => {
          event.preventDefault();
        }}
        onPressedChange={onPressedChange}
      >
        Bold
      </Toggle>,
    );

    await user.click(screen.getByRole('button', { name: 'Bold' }));
    expect(onPressedChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Bold' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('does not submit the form it sits in', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: FormEvent) => {
      event.preventDefault();
    });
    render(
      <form onSubmit={onSubmit}>
        <Toggle>Bold</Toggle>
      </form>,
    );

    // `type="button"` comes from Button, and the whole point of the boundary is
    // that a toggle has no form value: a control that submitted the page the
    // first time somebody put one in a toolbar inside a form would be found in
    // production, not here.
    await user.click(screen.getByRole('button', { name: 'Bold' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Bold' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('stays put when disabled', () => {
    const onPressedChange = vi.fn();
    render(
      <Toggle disabled onPressedChange={onPressedChange}>
        Bold
      </Toggle>,
    );
    const toggle = screen.getByRole('button', { name: 'Bold' });
    expect(toggle).toBeDisabled();

    // Dispatched rather than clicked: the disabled treatment sets
    // `pointer-events: none`, which user-event refuses to click through — so
    // the interesting question (does the state move if a click reaches it?)
    // has to be asked directly.
    toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onPressedChange).not.toHaveBeenCalled();
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  it('forwards ref to the underlying element (React 19 ref-as-prop)', () => {
    // Every component must be as reachable as the element it wraps — focus,
    // measurement, a form lib's ref all depend on it.
    let el: HTMLElement | null = null;
    render(
      <Toggle
        ref={(node) => {
          el = node;
        }}
      >
        Bold
      </Toggle>,
    );
    expect(el).toBeInstanceOf(HTMLButtonElement);
  });

  it('LOOKS pressed, not only announces it', () => {
    // The one defect this component can ship silently. `aria-pressed` is
    // written by the component and asserted above, but the fill hangs off a
    // CSS-module class: drop `styles.toggle` from the className and every
    // other test here still passes — semantics intact, axe happy, snapshot
    // unchanged in every way that matters — while a sighted user is looking at
    // a toolbar whose buttons all look identical.
    renderUi(
      <>
        <Toggle>Off</Toggle>
        <Toggle defaultPressed>On</Toggle>
      </>,
    );
    const off = screen.getByRole('button', { name: 'Off' });
    const on = screen.getByRole('button', { name: 'On' });

    expect(getComputedStyle(on).backgroundColor).not.toBe(
      getComputedStyle(off).backgroundColor,
    );
  });

  it('matches the rendered snapshot', () => {
    const { container } = render(<Toggle defaultPressed>Bold</Toggle>);
    expect(container.firstChild).toMatchSnapshot();
  });

  // axe in real Chromium — both states, in each theme. Pressed is the state
  // that repaints, so it is the one whose contrast has to be asserted.
  describe('accessibility (axe)', () => {
    const themes = [
      { name: 'light', theme: undefined },
      { name: 'dark', theme: 'dark' },
    ] as const;

    for (const { name, theme } of themes) {
      for (const pressed of [false, true] as const) {
        it(`has no violations — ${pressed ? 'on' : 'off'} / ${name}`, async () => {
          const { container } = renderUi(
            <div
              style={{
                background: 'var(--fm-color-background)',
                color: 'var(--fm-color-foreground)',
                padding: '1rem',
              }}
            >
              <Toggle defaultPressed={pressed}>Bold</Toggle>
            </div>,
            { theme },
          );
          await expectNoA11yViolations(container);
        });
      }
    }
  });

  it('survives two presses in one tick, each flipping once', () => {
    // Two synchronous `.click()`s land in one React batch. Computed from the
    // captured render value (`setOn(!on)`) both read `false`, both wrote
    // `true`, and the button stayed pressed after an even number of presses —
    // the exact shape `useControlled`'s doc names as the reason the updater
    // exists. The updater resolves each against the last value produced.
    const changes: boolean[] = [];
    render(<Toggle onPressedChange={(next) => changes.push(next)}>B</Toggle>);
    const button = screen.getByRole('button', { name: 'B' });

    act(() => {
      button.click();
      button.click();
    });

    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(changes).toEqual([true, false]);
  });
});

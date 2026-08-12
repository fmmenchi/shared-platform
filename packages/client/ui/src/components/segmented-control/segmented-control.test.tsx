import { useState } from 'react';
import type { ComponentProps } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { SegmentedControl } from './segmented-control.component.js';
import { SegmentedControlItem } from '../segmented-control-item/segmented-control-item.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

/** The set every test below picks from. */
function Alignment(props: Partial<ComponentProps<typeof SegmentedControl>>) {
  return (
    <SegmentedControl label="Text alignment" name="align" {...props}>
      <SegmentedControlItem value="left">Left</SegmentedControlItem>
      <SegmentedControlItem value="center">Center</SegmentedControlItem>
      <SegmentedControlItem value="right">Right</SegmentedControlItem>
    </SegmentedControl>
  );
}

/**
 * THE PART A POINTER CAN ACTUALLY REACH.
 *
 * The radio is `sr-only`: measured, one pixel at 158×18, clipped to nothing by
 * `clip-path: inset(50%)`, and `elementFromPoint` at its own centre returns the
 * LABEL. So no mouse and no finger can ever land on it — the label is the
 * target, and the browser forwards the activation to the control. That is the
 * whole point of the pattern.
 *
 * These tests used to click the input, and passed, because a synthesised event
 * is dispatched at a node and never asks whether a pointer could get there. A
 * browser-driven click asks, and refuses — which is the more honest answer, and
 * the reason the suite moved to one event engine (ADR-0002 §6). The query stays
 * semantic: role and name, then up to the thing you press.
 */
const segment = (name: string) =>
  screen.getByRole('radio', { name }).closest('label') as HTMLElement;

describe('SegmentedControl', () => {
  it('is a radio group, not a row of pressed buttons', () => {
    render(<Alignment defaultValue="left" />);

    // The decision (ADR-0025) as an assertion. "Exactly one of these" is a
    // radio group's question; `aria-pressed` cannot say that the siblings are
    // therefore off. If `button` ever shows up here, the wrong answer shipped.
    expect(
      screen.getByRole('radiogroup', { name: 'Text alignment' }),
    ).toBeTruthy();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByRole('radio', { name: 'Left' })).toBeChecked();
  });

  it('moves AND selects with the arrows, which is the platform’s own behaviour', async () => {
    render(<Alignment defaultValue="left" />);

    // The entire reason this is built on radios: nothing here implements a
    // keyboard. `Tab` reaches the set once, the arrows walk it, and walking
    // selects — the APG's radio-group contract, kept by the browser.
    await browser.tab();
    expect(screen.getByRole('radio', { name: 'Left' })).toHaveFocus();

    await browser.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Center' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Center' })).toHaveFocus();

    // And it wraps, again without a line of ours.
    await browser.keyboard('{ArrowRight}{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Left' })).toBeChecked();
  });

  it('takes ONE tab stop for the whole set', async () => {
    render(
      <>
        <Alignment defaultValue="center" />
        <button type="button">After</button>
      </>,
    );

    await browser.tab();
    expect(screen.getByRole('radio', { name: 'Center' })).toHaveFocus();
    await browser.tab();
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
  });

  it('reports the value the user picked', async () => {
    const onValueChange = vi.fn();
    render(<Alignment defaultValue="left" onValueChange={onValueChange} />);

    await browser.click(segment('Right'));
    expect(onValueChange).toHaveBeenCalledWith('right');
    expect(screen.getByRole('radio', { name: 'Right' })).toBeChecked();
  });

  it('lets the prop win when the group is controlled', async () => {
    function Driven() {
      const [value, setValue] = useState('left');
      return (
        <>
          <Alignment value={value} onValueChange={setValue} />
          <output>{value}</output>
        </>
      );
    }
    render(<Driven />);

    await browser.click(segment('Center'));
    expect(screen.getByRole('radio', { name: 'Center' })).toBeChecked();
    expect(screen.getByRole('status')).toHaveTextContent('center');
  });

  describe('the form, because a radio group is a field', () => {
    it('submits the chosen value under the shared name', async () => {
      const { container } = render(
        <form>
          <Alignment defaultValue="left" />
        </form>,
      );
      const form = container.querySelector('form') as HTMLFormElement;

      expect(new FormData(form).get('align')).toBe('left');
      await browser.click(segment('Right'));
      expect(new FormData(form).get('align')).toBe('right');
    });

    it('IS RESTORED BY form.reset(), because the DOM holds the choice', async () => {
      const { container } = render(
        <form>
          <Alignment defaultValue="center" />
        </form>,
      );
      const form = container.querySelector('form') as HTMLFormElement;

      await browser.click(segment('Right'));
      expect(screen.getByRole('radio', { name: 'Right' })).toBeChecked();

      // Uncontrolled, the item is handed `defaultChecked` and never `checked`.
      // The other branch would make this a no-op — React re-rendering its stale
      // value straight back — which is the measured failure the whole package
      // avoids by leaving the state where the browser keeps it.
      form.reset();
      expect(screen.getByRole('radio', { name: 'Center' })).toBeChecked();
    });
  });

  it('keeps an unavailable option in the set without selecting it', async () => {
    render(
      <SegmentedControl label="Export format" name="format" defaultValue="csv">
        <SegmentedControlItem value="csv">CSV</SegmentedControlItem>
        <SegmentedControlItem value="pdf" disabled>
          PDF
        </SegmentedControlItem>
      </SegmentedControl>,
    );

    const pdf = screen.getByRole('radio', { name: 'PDF' });
    expect(pdf).toBeDisabled();

    // `force` because the point IS the refusal. Playwright will not click a
    // control it can see is disabled — the check is a feature — but a person's
    // mouse has no such manners: it lands on those pixels anyway, and the
    // browser declines to activate. `force` skips the actionability wait and
    // still sends real pointer events, which is exactly that user.
    await browser.click(segment('PDF'), { force: true });
    expect(pdf).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'CSV' })).toBeChecked();
  });

  it('LOOKS selected, not only announces it', () => {
    // The defect this can ship silently: the segment's whole appearance hangs
    // off `:has(:checked)`, so a broken selector leaves the semantics intact,
    // axe happy and the snapshot unchanged — while every segment looks the
    // same and nobody can tell which one is chosen.
    renderUi(<Alignment defaultValue="center" />);
    const chosen = screen.getByRole('radio', { name: 'Center' })
      .parentElement as HTMLElement;
    const other = screen.getByRole('radio', { name: 'Left' })
      .parentElement as HTMLElement;

    expect(getComputedStyle(chosen).backgroundColor).not.toBe(
      getComputedStyle(other).backgroundColor,
    );
  });

  it('matches the rendered snapshot', () => {
    const { container } = render(<Alignment defaultValue="left" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  // axe in real Chromium — in each theme.
  describe('accessibility (axe)', () => {
    const themes = [
      { name: 'light', theme: undefined },
      { name: 'dark', theme: 'dark' },
    ] as const;

    for (const { name, theme } of themes) {
      it(`has no violations — ${name}`, async () => {
        const { container } = renderUi(
          <div
            style={{
              background: 'var(--fm-color-background)',
              color: 'var(--fm-color-foreground)',
              padding: '1rem',
            }}
          >
            <Alignment defaultValue="center" />
          </div>,
          { theme },
        );
        await expectNoA11yViolations(container);
      });
    }
  });

  it('takes the native aria-label as the name, not as a casualty of the spread', () => {
    // Muscle memory writes the attribute instead of the `label` prop. It used
    // to ride in through the spread and be overwritten with `undefined` a line
    // later — React removes the attribute, so the group lost its name AND the
    // `radiogroup` role that travels with it, silently.
    render(
      <SegmentedControl name="align" defaultValue="l" aria-label="Allineamento">
        <SegmentedControlItem value="l">Sinistra</SegmentedControlItem>
        <SegmentedControlItem value="r">Destra</SegmentedControlItem>
      </SegmentedControl>,
    );
    expect(
      screen.getByRole('radiogroup', { name: 'Allineamento' }),
    ).toBeInTheDocument();
  });
});

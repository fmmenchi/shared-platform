import { useState } from 'react';
import type { ComponentProps } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    const user = userEvent.setup();
    render(<Alignment defaultValue="left" />);

    // The entire reason this is built on radios: nothing here implements a
    // keyboard. `Tab` reaches the set once, the arrows walk it, and walking
    // selects — the APG's radio-group contract, kept by the browser.
    await user.tab();
    expect(screen.getByRole('radio', { name: 'Left' })).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Center' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Center' })).toHaveFocus();

    // And it wraps, again without a line of ours.
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Left' })).toBeChecked();
  });

  it('takes ONE tab stop for the whole set', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Alignment defaultValue="center" />
        <button type="button">After</button>
      </>,
    );

    await user.tab();
    expect(screen.getByRole('radio', { name: 'Center' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
  });

  it('reports the value the user picked', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Alignment defaultValue="left" onValueChange={onValueChange} />);

    await user.click(screen.getByRole('radio', { name: 'Right' }));
    expect(onValueChange).toHaveBeenCalledWith('right');
    expect(screen.getByRole('radio', { name: 'Right' })).toBeChecked();
  });

  it('lets the prop win when the group is controlled', async () => {
    const user = userEvent.setup();
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

    await user.click(screen.getByRole('radio', { name: 'Center' }));
    expect(screen.getByRole('radio', { name: 'Center' })).toBeChecked();
    expect(screen.getByRole('status')).toHaveTextContent('center');
  });

  describe('the form, because a radio group is a field', () => {
    it('submits the chosen value under the shared name', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <form>
          <Alignment defaultValue="left" />
        </form>,
      );
      const form = container.querySelector('form') as HTMLFormElement;

      expect(new FormData(form).get('align')).toBe('left');
      await user.click(screen.getByRole('radio', { name: 'Right' }));
      expect(new FormData(form).get('align')).toBe('right');
    });

    it('IS RESTORED BY form.reset(), because the DOM holds the choice', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <form>
          <Alignment defaultValue="center" />
        </form>,
      );
      const form = container.querySelector('form') as HTMLFormElement;

      await user.click(screen.getByRole('radio', { name: 'Right' }));
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
    const user = userEvent.setup();
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
    await user.click(pdf);
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

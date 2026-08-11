import { useState } from 'react';
import type { ChangeEvent, ComponentProps } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Switch } from './switch.component.js';
import { Field } from '../field/field.component.js';
import { ChoiceField } from '../choice-field/choice-field.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

/**
 * The knob's colour out of the computed gradient — the FIRST colour function in
 * it, whatever notation it is in. The tokens are authored in `oklch()` and
 * Chromium serialises them back as `oklch()`, so a regex looking for `rgb(`
 * finds the gradient's transparent stop instead and every number after that is
 * fiction. Measured: it made this assertion read 2.46 for a pair that is
 * actually well clear of the bar.
 */
function firstColour(value: string): string | undefined {
  return /(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\([^)]*\)/.exec(value)?.[0];
}

/**
 * CSS colour → sRGB, by painting it. Anything else means reimplementing
 * `oklch()` conversion in the test, which is how a test starts asserting its
 * own arithmetic instead of the browser's; this asks the same engine that
 * renders the control what it actually drew.
 */
function toRgb(colour: string): [number, number, number] {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('no 2d context');
  ctx.fillStyle = '#000';
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, 1, 1);
  const [r = 0, g = 0, b = 0] = ctx.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}

/** WCAG relative luminance, then the 1.4.11 ratio. Sorted, so order is free. */
function contrast(a: string, b: string): number {
  const luminance = (colour: string) => {
    const channel = (c: number) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    const [r, g, b] = toRgb(colour);
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  };
  const [light = 0, dark = 0] = [luminance(a), luminance(b)].sort(
    (x, y) => y - x,
  );
  return (light + 0.05) / (dark + 0.05);
}

/** The control plus the words next to it, which is how a switch is labelled. */
function Labelled(props: ComponentProps<typeof Switch>) {
  return (
    <label>
      <Switch {...props} /> Notifications
    </label>
  );
}

describe('Switch', () => {
  it('is a switch, and takes its name from the label it is nested in', () => {
    render(<Labelled />);

    const control = screen.getByRole('switch', { name: 'Notifications' });
    expect(control).toBeInTheDocument();
    expect(control).not.toBeChecked();
  });

  it('is neither a checkbox nor a button, whatever it is built on', () => {
    render(<Labelled defaultChecked />);

    // The boundary (ADR-0024) as an assertion. `role="switch"` REPLACES the
    // implicit checkbox role, so a screen reader says "switch, on" — and if
    // either of the other two roles ever shows up here, the wrong one of the
    // three shipped.
    expect(screen.getByRole('switch')).toBeChecked();
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('is always type="checkbox" — the type is its identity, not an axis', () => {
    render(<Labelled />);
    expect(screen.getByRole('switch')).toHaveAttribute('type', 'checkbox');
  });

  it('answers to Space, the key a checkbox answers to', async () => {
    const user = userEvent.setup();
    render(<Labelled />);
    const control = screen.getByRole('switch');

    await user.tab();
    expect(control).toHaveFocus();
    await user.keyboard(' ');
    expect(control).toBeChecked();
  });

  it('extends the click target to the label text', async () => {
    const user = userEvent.setup();
    render(<Labelled />);

    await user.click(screen.getByText('Notifications'));
    expect(screen.getByRole('switch')).toBeChecked();
  });

  describe('the form, which is why this one is an input', () => {
    it('submits with the form, with no JavaScript state at all', () => {
      const { container } = render(
        <form>
          <Labelled name="notify" defaultChecked />
        </form>,
      );

      const form = container.querySelector('form') as HTMLFormElement;
      expect(new FormData(form).get('notify')).toBe('on');
    });

    it('submits nothing when it is off — the platform’s own rule', () => {
      const { container } = render(
        <form>
          <Labelled name="notify" />
        </form>,
      );

      const form = container.querySelector('form') as HTMLFormElement;
      expect(new FormData(form).get('notify')).toBeNull();
    });

    it('takes a value when one is given, instead of "on"', () => {
      const { container } = render(
        <form>
          <Labelled name="notify" value="email" defaultChecked />
        </form>,
      );

      const form = container.querySelector('form') as HTMLFormElement;
      expect(new FormData(form).get('notify')).toBe('email');
    });

    it('IS RESTORED BY form.reset(), which is the whole reason the DOM holds the state', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <form>
          <Labelled name="notify" defaultChecked />
        </form>,
      );
      const control = screen.getByRole('switch');
      const form = container.querySelector('form') as HTMLFormElement;

      await user.click(control);
      expect(control).not.toBeChecked();

      // The measured failure this pins: hold the state in React instead and
      // reset becomes a NO-OP — React re-renders its stale value straight back,
      // breaking `<button type="reset">` and a form library's `reset(data)`.
      // `Toggle` cannot have this, and that is the boundary, not an oversight.
      form.reset();
      expect(control).toBeChecked();
    });
  });

  describe('transparency (ADR-0013)', () => {
    it('spreads arbitrary native props through to the input', () => {
      render(<Labelled required data-testid="raw" />);
      const control = screen.getByRole('switch');
      expect(control).toBeRequired();
      expect(control).toHaveAttribute('data-testid', 'raw');
    });

    it('works uncontrolled — it does not hijack checked', async () => {
      const user = userEvent.setup();
      render(<Labelled defaultChecked />);
      const control = screen.getByRole('switch');

      await user.click(control);
      expect(control).not.toBeChecked();
      await user.click(control);
      expect(control).toBeChecked();
    });

    it('works controlled — nothing moves unless the parent moves it', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Labelled checked={false} onChange={onChange} />);

      await user.click(screen.getByRole('switch'));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('switch')).not.toBeChecked();
    });

    it('is driven from outside — parent state is the single source of truth', async () => {
      const user = userEvent.setup();
      function Driven() {
        const [on, setOn] = useState(false);
        return (
          <>
            <Labelled checked={on} onChange={(e) => setOn(e.target.checked)} />
            <output>{on ? 'on' : 'off'}</output>
          </>
        );
      }
      render(<Driven />);

      await user.click(screen.getByRole('switch'));
      expect(screen.getByRole('switch')).toBeChecked();
      expect(screen.getByRole('status')).toHaveTextContent('on');
    });

    it('leaves onChange a plain passthrough, with the browser’s own post-click values', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn((event: ChangeEvent<HTMLInputElement>) => {
        expect(event.target.checked).toBe(true);
      });
      render(<Labelled onChange={onChange} />);

      await user.click(screen.getByRole('switch'));
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('merges a consumer className rather than replacing ours', () => {
      render(<Labelled className="mine" />);
      const control = screen.getByRole('switch');
      expect(control).toHaveClass('mine');
      expect(control.className.split(' ').length).toBeGreaterThan(1);
    });

    it('reflects the disabled state', () => {
      render(<Labelled disabled />);
      expect(screen.getByRole('switch')).toBeDisabled();
    });

    it('forwards ref to the input element (React 19 ref-as-prop)', () => {
      let el: HTMLElement | null = null;
      render(
        <Labelled
          ref={(node) => {
            el = node;
          }}
        />,
      );
      expect(el).toBeInstanceOf(HTMLInputElement);
    });
  });

  describe('field wiring', () => {
    it('takes the id from a Field so its label associates', () => {
      render(
        <Field label="Notifications">
          <Switch />
        </Field>,
      );
      expect(
        screen.getByRole('switch', { name: 'Notifications' }),
      ).toBeTruthy();
    });

    it('drops into a ChoiceField, hint, error and all', () => {
      render(
        <ChoiceField label="Notifications" hint="We email once a week">
          <Switch name="notify" />
        </ChoiceField>,
      );

      const control = screen.getByRole('switch', { name: 'Notifications' });
      expect(control).toHaveAccessibleDescription('We email once a week');
    });
  });

  describe('appearance — the one control in this family we draw', () => {
    it('is 44×24, so the target clears WCAG 2.5.8 on its own', () => {
      renderUi(<Labelled />);
      const box = screen.getByRole('switch').getBoundingClientRect();
      expect(Math.round(box.width)).toBe(44);
      expect(Math.round(box.height)).toBe(24);
    });

    it('LOOKS on, and not by colour alone', () => {
      // Both cues asserted, because both are load-bearing: the fill is what a
      // sighted user reads at a glance, and the knob's POSITION is what still
      // says "on" in Windows High Contrast, where every token fill collapses.
      // `Radio` measured the consequence of relying on a drawn mark alone.
      renderUi(
        <>
          <label>
            <Switch /> Off
          </label>
          <label>
            <Switch defaultChecked /> On
          </label>
        </>,
      );
      const [off, on] = screen.getAllByRole('switch');
      const offStyle = getComputedStyle(off as Element);
      const onStyle = getComputedStyle(on as Element);

      expect(onStyle.backgroundColor).not.toBe(offStyle.backgroundColor);
      expect(onStyle.backgroundPositionX).not.toBe(
        offStyle.backgroundPositionX,
      );
    });

    it('keeps the knob 3:1 against the track, in both states and both themes', () => {
      // WCAG 1.4.11, and axe cannot see it: the knob is not text and not a
      // border, it is a gradient painted into the background, so every
      // automated check in this package passes a switch whose two parts are
      // indistinguishable. For a control we draw, that contrast IS the state.
      for (const theme of [undefined, 'dark'] as const) {
        renderUi(
          <>
            <label>
              <Switch /> Off
            </label>
            <label>
              <Switch defaultChecked /> On
            </label>
          </>,
          { theme },
        );
        for (const control of screen.getAllByRole('switch')) {
          const style = getComputedStyle(control);
          const knob = firstColour(style.backgroundImage);
          expect(knob, 'the knob is painted as a gradient').toBeTruthy();
          expect(
            contrast(knob as string, style.backgroundColor),
            `knob against track, ${theme ?? 'light'}`,
          ).toBeGreaterThanOrEqual(3);
        }
        cleanup();
      }
    });

    it('follows the COMPUTED direction, not the attribute', () => {
      // The two shapes the attribute selectors answered wrong, measured first
      // by `dialog-content.module.css`: an `ltr` island inside an `rtl` page
      // matched `[dir='rtl'] .switch` through the ancestor — knob positions
      // inverted inside the island — and rtl inherited from an ancestor with
      // nothing on the control still has to flip. `:dir()` resolves what the
      // element actually is, so both come out right with one selector.
      //
      // (`dir="auto"` is deliberately NOT here: on an <input> it resolves from
      // the VALUE, not the surroundings, so an empty checkbox is ltr per spec
      // — with either implementation.)
      renderUi(
        <div dir="rtl">
          <div dir="ltr">
            <label>
              <Switch defaultChecked /> Island
            </label>
          </div>
          <label>
            <Switch defaultChecked /> Inherited
          </label>
        </div>,
      );
      const [island, inherited] = screen.getAllByRole('switch');
      // The island is ltr: checked sits at the RIGHT — the ltr answer the
      // ancestor-matching selector used to get wrong.
      expect(getComputedStyle(island as Element).backgroundPosition).toBe(
        '100% 50%',
      );
      // Inherited rtl, nothing on the control itself: checked sits LEFT.
      expect(getComputedStyle(inherited as Element).backgroundPosition).toBe(
        '0% 50%',
      );
    });

    it('puts the knob at the other end under dir="rtl"', () => {
      renderUi(
        <>
          <label>
            <Switch defaultChecked /> Ltr
          </label>
          <label dir="rtl">
            <Switch dir="rtl" defaultChecked /> Rtl
          </label>
        </>,
      );
      const [ltr, rtl] = screen.getAllByRole('switch');

      // `background-position` has no logical form, so the flip is a rule rather
      // than a property doing it for us — which means it can silently stop
      // happening. Both selector forms exist for the reason `Select` records;
      // this asserts the one that is easy to get wrong (the attribute ON the
      // control, not on an ancestor).
      expect(getComputedStyle(rtl as Element).backgroundPositionX).not.toBe(
        getComputedStyle(ltr as Element).backgroundPositionX,
      );
    });
  });

  it('matches the rendered snapshot', () => {
    const { container } = render(<Labelled defaultChecked />);
    expect(container.firstChild).toMatchSnapshot();
  });

  // axe in real Chromium — every state, in each theme.
  describe('accessibility (axe)', () => {
    const themes = [
      { name: 'light', theme: undefined },
      { name: 'dark', theme: 'dark' },
    ] as const;

    for (const { name, theme } of themes) {
      it(`has no violations — on / off / disabled / ${name}`, async () => {
        const { container } = renderUi(
          <div
            style={{
              background: 'var(--fm-color-background)',
              color: 'var(--fm-color-foreground)',
              padding: '1rem',
            }}
          >
            <label>
              <Switch /> Off
            </label>
            <label>
              <Switch defaultChecked /> On
            </label>
            <label>
              <Switch disabled /> Unavailable
            </label>
          </div>,
          { theme },
        );
        await expectNoA11yViolations(container);
      });
    }
  });
});

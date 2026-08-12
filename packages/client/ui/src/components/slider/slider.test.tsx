import { useState } from 'react';
import type { ChangeEvent, ComponentProps } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
// Real keys through the provider, not synthetic events: the slider's keyboard
// IS the browser's default behaviour, and an untrusted `keydown` triggers none
// of it — the same reason Tabs drives its roving focus this way.
import { userEvent as browser } from '@vitest/browser/context';
import { Slider } from './slider.component.js';
import { Field } from '../field/field.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';
import { contrast } from '../../test/contrast.js';

/** The pairing under document: an EXTERNAL `<label htmlFor>`. */
function Labelled(props: ComponentProps<typeof Slider>) {
  return (
    <>
      <label htmlFor="volume">Volume</label>
      <Slider id="volume" {...props} />
    </>
  );
}

/** The one derived fact the component owns — the painted fill, off the element. */
function fillOf(control: HTMLElement): string {
  return control.style.getPropertyValue('--slider-fill');
}

/**
 * Every parsed style rule touching the slider's vendor pseudos, out of the
 * CSSOM — recursing into `@layer` and `@media` blocks, where all of ours live.
 *
 * The CSSOM rather than the pseudo's computed style, and not by preference:
 * measured here, `getComputedStyle(el, '::-webkit-slider-runnable-track')`
 * does not answer for Blink's internal slider parts — an unsupported pseudo
 * argument falls back to the ELEMENT's own style, which returned `none` for
 * the track's gradient. What the CSSOM does give is exactly the two claims a
 * computed read cannot: that Chromium PARSED each vendor rule (an unknown
 * selector anywhere in a list throws the whole rule away — the classic way a
 * slider ships styled in one engine and naked in another), and what each rule
 * actually says.
 */
function sliderPseudoRules(): CSSStyleRule[] {
  const out: CSSStyleRule[] = [];
  const walk = (rules: CSSRuleList) => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSStyleRule && rule.selectorText.includes('slider'))
        out.push(rule);
      if ('cssRules' in rule) walk((rule as CSSGroupingRule).cssRules);
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      walk(sheet.cssRules);
    } catch {
      // A cross-origin sheet has no readable rules — none of ours are.
    }
  }
  return out;
}

describe('Slider', () => {
  it('is a slider, named by the external label', () => {
    render(<Labelled />);

    const control = screen.getByRole('slider', { name: 'Volume' });
    expect(control).toBeInTheDocument();
    // No value given: the platform starts at the midpoint of 0–100.
    expect(control).toHaveValue('50');
  });

  it('is always type="range" — the type is its identity, not an axis', () => {
    render(<Labelled />);
    expect(screen.getByRole('slider')).toHaveAttribute('type', 'range');
  });

  describe('the keyboard, which is native and therefore untouched', () => {
    it('steps with the horizontal arrows', async () => {
      render(<Labelled defaultValue={30} />);
      const control = screen.getByRole('slider');

      control.focus();
      await browser.keyboard('{ArrowRight}');
      expect(control).toHaveValue('31');
      await browser.keyboard('{ArrowLeft}');
      expect(control).toHaveValue('30');
    });

    it('steps with the vertical arrows too — a slider answers all four', async () => {
      render(<Labelled defaultValue={30} />);
      const control = screen.getByRole('slider');

      control.focus();
      await browser.keyboard('{ArrowUp}');
      expect(control).toHaveValue('31');
      await browser.keyboard('{ArrowDown}');
      expect(control).toHaveValue('30');
    });

    it('jumps to the ends with Home and End', async () => {
      render(<Labelled defaultValue={30} />);
      const control = screen.getByRole('slider');

      control.focus();
      await browser.keyboard('{End}');
      expect(control).toHaveValue('100');
      await browser.keyboard('{Home}');
      expect(control).toHaveValue('0');
    });

    it('takes the engine’s larger jump on PageUp/PageDown', async () => {
      // Engine-defined, which is the point of adding nothing: Chromium's big
      // step is a tenth of the range. This pins the CLAIM (the keys reach the
      // native handler), not the constant — if the engine changes its stride,
      // the docs' "where the engine implements them" hedge already covers it.
      render(<Labelled defaultValue={30} />);
      const control = screen.getByRole('slider') as HTMLInputElement;

      control.focus();
      await browser.keyboard('{PageUp}');
      expect(control.valueAsNumber).toBeGreaterThan(30);
      await browser.keyboard('{PageDown}');
      expect(control).toHaveValue('30');
    });

    it('honours min/max/step, because they reach the element untouched', async () => {
      render(<Labelled min={0} max={10} step={2} defaultValue={4} />);
      const control = screen.getByRole('slider');

      control.focus();
      await browser.keyboard('{ArrowRight}');
      expect(control).toHaveValue('6');
    });
  });

  describe('the painted fill — one derived fact, written where the value lives', () => {
    it('is computed at render from the uncontrolled seed', () => {
      render(<Labelled defaultValue={25} />);
      expect(fillOf(screen.getByRole('slider'))).toBe('25%');
    });

    it('is the platform midpoint when no value is given', () => {
      render(<Labelled />);
      expect(fillOf(screen.getByRole('slider'))).toBe('50%');
    });

    it('measures against min/max, not against 0–100', () => {
      render(<Labelled min={50} max={100} defaultValue={75} />);
      expect(fillOf(screen.getByRole('slider'))).toBe('50%');
    });

    it('follows the user’s input with no render — the element listener owns it', async () => {
      render(<Labelled defaultValue={30} />);
      const control = screen.getByRole('slider');

      control.focus();
      await browser.keyboard('{ArrowRight}');
      expect(control).toHaveValue('31');
      expect(fillOf(control)).toBe('31%');
    });

    it('survives a re-render with moved bounds — the DOM, not the seed, decides', async () => {
      // The MEASURED hazard this pins: the render-time percentage is computed
      // from PROPS, and on an uncontrolled slider those are the stale seed —
      // after a drag, a render where they changed would repaint the seed's
      // position over the listener's. The component re-derives from the
      // element after any such write; a shrunken `max` even CLAMPS the DOM
      // value with no `input` event, so only a DOM read can be right.
      const { rerender } = render(<Labelled defaultValue={30} />);
      const control = screen.getByRole('slider');

      control.focus();
      await browser.keyboard('{ArrowRight}');
      expect(control).toHaveValue('31');

      rerender(<Labelled defaultValue={30} max={50} />);
      // Still the dragged 31, now measured against 0–50.
      expect(control).toHaveValue('31');
      await waitFor(() => expect(fillOf(control)).toBe('62%'));
    });

    it('snaps back with a pinned controlled value, the way the thumb does', async () => {
      // Controlled, parent ignores the change: React restores the DOM value
      // right after the handlers run — and the fill must follow the RESTORED
      // value, not the position the finger asked for (hence the deferred
      // second paint in the component).
      const onChange = vi.fn();
      render(<Labelled value={20} onChange={onChange} />);
      const control = screen.getByRole('slider');

      control.focus();
      await browser.keyboard('{ArrowRight}');
      expect(onChange).toHaveBeenCalled();
      expect(control).toHaveValue('20');
      await waitFor(() => expect(fillOf(control)).toBe('20%'));
    });

    it('follows a driven controlled value through the render', async () => {
      function Driven() {
        const [volume, setVolume] = useState(20);
        return (
          <Labelled
            value={volume}
            onChange={(event) => setVolume(event.target.valueAsNumber)}
          />
        );
      }
      render(<Driven />);
      const control = screen.getByRole('slider');

      control.focus();
      await browser.keyboard('{ArrowRight}');
      expect(control).toHaveValue('21');
      await waitFor(() => expect(fillOf(control)).toBe('21%'));
    });
  });

  describe('the spoken value — getValueText, written exactly like the fill', () => {
    it('is computed at render', () => {
      render(
        <Labelled defaultValue={30} getValueText={(v) => `${v} minutes`} />,
      );
      expect(screen.getByRole('slider')).toHaveAttribute(
        'aria-valuetext',
        '30 minutes',
      );
    });

    it('follows the user’s input on an UNCONTROLLED slider — never stale', async () => {
      // The hazard the prop exists to end: a static `aria-valuetext` on an
      // uncontrolled slider freezes while the value moves, and OVERRIDES the
      // correct `aria-valuenow` with the wrong words.
      render(
        <Labelled defaultValue={30} getValueText={(v) => `${v} minutes`} />,
      );
      const control = screen.getByRole('slider');

      control.focus();
      await browser.keyboard('{ArrowRight}');
      expect(control).toHaveAttribute('aria-valuetext', '31 minutes');
    });
  });

  describe('the form, which is why the DOM holds the value', () => {
    it('submits with the form, with no JavaScript state at all', () => {
      const { container } = render(
        <form>
          <Labelled name="volume" defaultValue={30} />
        </form>,
      );

      const form = container.querySelector('form') as HTMLFormElement;
      expect(new FormData(form).get('volume')).toBe('30');
    });

    it('IS RESTORED BY form.reset() — the value, the painted fill AND the spoken value', async () => {
      const { container } = render(
        <form>
          <Labelled
            name="volume"
            defaultValue={30}
            getValueText={(v) => `${v} minutes`}
          />
        </form>,
      );
      const control = screen.getByRole('slider');
      const form = container.querySelector('form') as HTMLFormElement;

      control.focus();
      await browser.keyboard('{ArrowRight}');
      expect(control).toHaveValue('31');
      expect(fillOf(control)).toBe('31%');
      expect(control).toHaveAttribute('aria-valuetext', '31 minutes');

      // `form.reset()` fires NO `input` event, and at `reset`-dispatch time
      // the OLD value is still in the DOM — the component listens on the
      // document, matches the form at event time, and re-reads after a
      // microtask, which is what this pins.
      form.reset();
      expect(control).toHaveValue('30');
      await waitFor(() => expect(fillOf(control)).toBe('30%'));
      expect(control).toHaveAttribute('aria-valuetext', '30 minutes');
    });
  });

  describe('transparency (ADR-0013)', () => {
    it('spreads arbitrary native props through to the input', () => {
      render(<Labelled name="volume" data-testid="raw" />);
      const control = screen.getByRole('slider');
      expect(control).toHaveAttribute('name', 'volume');
      expect(control).toHaveAttribute('data-testid', 'raw');
    });

    it('passes a static aria-valuetext through, for CONTROLLED usage that re-renders it', () => {
      // The static form is documented as controlled-only: the consumer's
      // render keeps it true, the way this one does. Uncontrolled, it goes
      // stale on the first drag — `getValueText` is the prop for that.
      render(<Labelled value={30} readOnly aria-valuetext="30 minutes" />);
      expect(screen.getByRole('slider')).toHaveAttribute(
        'aria-valuetext',
        '30 minutes',
      );
    });

    it('leaves onChange a plain passthrough, with the browser’s post-input value', async () => {
      const onChange = vi.fn((event: ChangeEvent<HTMLInputElement>) => {
        expect(event.target.value).toBe('31');
      });
      render(<Labelled defaultValue={30} onChange={onChange} />);

      screen.getByRole('slider').focus();
      await browser.keyboard('{ArrowRight}');
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('merges a consumer className rather than replacing ours', () => {
      render(<Labelled className="mine" />);
      const control = screen.getByRole('slider');
      expect(control).toHaveClass('mine');
      expect(control.className.split(' ').length).toBeGreaterThan(1);
    });

    it('merges a consumer style, and their custom property wins over our coat', () => {
      render(<Labelled defaultValue={30} style={{ marginInline: '4px' }} />);
      const control = screen.getByRole('slider');
      // Both survive on the element: their declaration and our fill.
      expect(control.style.marginInline).toBe('4px');
      expect(fillOf(control)).toBe('30%');
    });

    it('reflects the disabled state', () => {
      render(<Labelled disabled />);
      expect(screen.getByRole('slider')).toBeDisabled();
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
        <Field label="Volume">
          <Slider />
        </Field>,
      );
      expect(screen.getByRole('slider', { name: 'Volume' })).toBeTruthy();
    });
  });

  describe('appearance — a drawn control answers for what it draws', () => {
    it('gives the box at least the 24px WCAG 2.5.8 asks, over a thin track', () => {
      renderUi(<Labelled />);
      const box = screen.getByRole('slider').getBoundingClientRect();
      expect(box.height).toBeGreaterThanOrEqual(24);
      // The 44px coarse-pointer case lives with the family's policy, in
      // `test/target-size.touch.test.tsx`.
    });

    it('keeps fill and thumb 3:1 against the groove, in both themes', () => {
      // WCAG 1.4.11, and axe cannot see it: the fill is a gradient stop and
      // the thumb a pseudo-element's background — neither is text nor a
      // border, so every automated check in this package passes a slider
      // whose parts are indistinguishable. For a control we draw, that
      // contrast IS the value being shown.
      //
      // Measured off the element's COMPUTED custom properties — the exact
      // values the track gradient and the thumb consume (the parse-validity
      // test below ties the thumb to `--slider-progress`), theme-resolved per
      // element. The pseudos' own computed styles are not readable in Blink;
      // see `sliderPseudoRules`.
      for (const theme of [undefined, 'dark'] as const) {
        renderUi(<Labelled defaultValue={50} />, { theme });
        const style = getComputedStyle(screen.getByRole('slider'));
        const fill = style.getPropertyValue('--slider-progress').trim();
        const groove = style.getPropertyValue('--slider-track').trim();

        expect(fill, 'the fill token resolves').toBeTruthy();
        expect(groove, 'the groove token resolves').toBeTruthy();
        expect(
          contrast(fill, groove),
          `fill and thumb against groove, ${theme ?? 'light'}`,
        ).toBeGreaterThanOrEqual(3);
        cleanup();
      }
    });

    it('ships every vendor rule alone, parsed, and flipped by :dir()', () => {
      renderUi(<Labelled defaultValue={30} />);
      const rules = sliderPseudoRules();
      const tracks = rules.filter(
        (rule) =>
          rule.selectorText.includes('-webkit-slider-runnable-track') &&
          rule.cssText.includes('linear-gradient'),
      );

      // The base gradient runs to the right; the `:dir(rtl)` one to the left.
      // `:dir()` and never `[dir]`: the attribute matches an ANCESTOR's
      // attribute while `:dir()` resolves the element's computed direction —
      // an ltr island inside an rtl page, and rtl inherited from an ancestor,
      // both come out right only with the functional form (both shapes
      // measured on Switch, where the geometry is element-level and therefore
      // observable; the gradient lives in a pseudo Blink will not let a test
      // read, so the selector form is the assertable fact here).
      const base = tracks.find((r) => !r.selectorText.includes(':dir'));
      const flipped = tracks.find((r) => r.selectorText.includes(':dir(rtl)'));
      expect(base?.cssText).toContain('to right');
      expect(flipped?.cssText).toContain('to left');
      expect(rules.some((r) => r.selectorText.includes('[dir'))).toBe(false);

      // Each vendor pseudo stands in a selector list of ONE — an unknown
      // selector invalidates the whole list, so a shared rule is styled in
      // the engine it was written in and thrown away in the other.
      const vendor = rules.filter((rule) =>
        /-webkit-slider|-moz-range/.test(rule.selectorText),
      );
      expect(vendor.length).toBeGreaterThanOrEqual(4);
      for (const rule of vendor) {
        expect(rule.selectorText, rule.selectorText).not.toContain(',');
      }

      // And the thumb draws from the same property the contrast test above
      // measures — the tie that makes one measurement answer for both parts.
      const thumb = vendor.find((r) =>
        r.selectorText.includes('-webkit-slider-thumb'),
      );
      expect(thumb?.cssText).toContain('var(--slider-progress)');
    });
  });

  it('matches the rendered snapshot', () => {
    const { container } = render(<Labelled defaultValue={30} />);
    expect(container).toMatchSnapshot();
  });

  // axe in real Chromium — every state, in each theme.
  describe('accessibility (axe)', () => {
    const themes = [
      { name: 'light', theme: undefined },
      { name: 'dark', theme: 'dark' },
    ] as const;

    for (const { name, theme } of themes) {
      it(`has no violations — empty / mid / disabled / ${name}`, async () => {
        const { container } = renderUi(
          <div
            style={{
              background: 'var(--fm-color-background)',
              color: 'var(--fm-color-foreground)',
              padding: '1rem',
            }}
          >
            <Slider aria-label="Empty" defaultValue={0} />
            <Slider aria-label="Half" defaultValue={50} />
            <Slider aria-label="Unavailable" defaultValue={30} disabled />
          </div>,
          { theme },
        );
        await expectNoA11yViolations(container);
      });
    }
  });

  it('repaints after a value written straight onto the element', async () => {
    // react-hook-form's `setValue`/`reset` assign `ref.value` and dispatch
    // nothing; this package ships that binding and has no `FormSlider` to
    // route around it. Keyed on props, the paint effect never ran for such a
    // write and no later render repaired it: the thumb moved to 80 and the
    // track stayed filled to 30, permanently — while a native `form.reset()`
    // DID repaint, because a listener exists for that one. One gesture, two
    // behaviours.
    function Host() {
      const [, bump] = useState(0);
      return (
        <>
          <button type="button" onClick={() => bump((n) => n + 1)}>
            rerender
          </button>
          <Slider aria-label="Volume" defaultValue={30} />
        </>
      );
    }
    render(<Host />);
    const slider = screen.getByRole('slider') as HTMLInputElement;
    expect(slider.style.getPropertyValue('--slider-fill')).toBe('30%');

    slider.value = '80';
    await browser.click(screen.getByRole('button', { name: 'rerender' }));

    await waitFor(() => {
      expect(slider.style.getPropertyValue('--slider-fill')).toBe('80%');
    });
  });
});

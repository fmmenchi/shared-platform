import { describe, it, expect, vi } from 'vitest';
import { createElement, Fragment, StrictMode, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { Toolbar } from './toolbar.component.js';
import { ToolbarItem } from '../toolbar-item/toolbar-item.component.js';
import { ToolbarSeparator } from '../toolbar-separator/toolbar-separator.component.js';
import { Button } from '../button/button.component.js';
import { Tooltip } from '../tooltip/tooltip.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

/**
 * The third family in this package walked by the arrows, and the first that
 * does not own what it walks — so what has to be proved here is not the ring
 * (that is `roving.ts`, proved by the menu and the tabs) but the SEAM: that a
 * control handed to `ToolbarItem` comes out the other side with everything it
 * arrived with, and one thing added.
 *
 * Two claims are behaviour no query can see and are asserted anyway: that
 * exactly ONE control is in the page's tab order, which is the entire point of
 * the pattern, and that the bar never ends up with no tab stop at all — the
 * roving pattern's own failure mode, and the one that hides a whole bar of
 * controls from the keyboard.
 */
const three = (props: Partial<React.ComponentProps<typeof Toolbar>> = {}) => (
  <Toolbar label="Text formatting" {...props}>
    <ToolbarItem>
      <button type="button">Bold</button>
    </ToolbarItem>
    <ToolbarItem>
      <button type="button">Italic</button>
    </ToolbarItem>
    <ToolbarItem>
      <button type="button">Underline</button>
    </ToolbarItem>
  </Toolbar>
);

const control = (name: string) => screen.getByRole('button', { name });

/**
 * EVERYTHING INSIDE THE BAR THAT `Tab` WOULD ACTUALLY STOP ON.
 *
 * The first version of this helper read `getAllByRole('button')` and kept those
 * with `tabindex="0"`, which was blind to most of what can go wrong: it could
 * not see a field, could not see a `<div>` the toolbar had made focusable by
 * writing a `tabindex` onto it, and — worst — counted an element with NO
 * `tabindex` attribute as "not a stop", when a bare `<button>` is precisely the
 * page's own tab stop. Three of the defects this file now covers were invisible
 * to it.
 *
 * So it asks the question the browser asks: is this in the tab order, can it
 * take focus, is it rendered.
 */
const stops = () =>
  Array.from(screen.getByRole('toolbar').querySelectorAll<HTMLElement>('*'))
    .filter(
      (node) =>
        node.tabIndex >= 0 &&
        !node.matches(':disabled') &&
        node.checkVisibility({ visibilityProperty: true }),
    )
    .map(
      (node) =>
        node.getAttribute('aria-label') ?? node.textContent?.trim() ?? '',
    );

describe('Toolbar', () => {
  it('renders the role, and names the bar', async () => {
    render(three());

    const bar = screen.getByRole('toolbar', { name: 'Text formatting' });
    expect(bar).toBeInTheDocument();
    // ABSENT, not `"horizontal"`. That is what `role="toolbar"` already means,
    // and stating a default is a second place for it to be wrong.
    expect(bar).not.toHaveAttribute('aria-orientation');
    expect(bar).toHaveAttribute('data-orientation', 'horizontal');
  });

  it('says so when it runs vertically', async () => {
    render(three({ orientation: 'vertical' }));

    const bar = screen.getByRole('toolbar');
    expect(bar).toHaveAttribute('aria-orientation', 'vertical');
    expect(bar).toHaveAttribute('data-orientation', 'vertical');
  });

  it('puts the tab stop on the first control, and takes it off the bar', async () => {
    render(three());

    // The APG puts the `0` on the first CONTROL, not on the bar: a screen
    // reader should hear "Bold, button" on the first Tab, not "toolbar" and
    // then "Bold, button".
    await waitFor(() => expect(stops()).toEqual(['Bold']));
    expect(control('Italic')).toHaveAttribute('tabindex', '-1');
    expect(control('Underline')).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('toolbar')).toHaveAttribute('tabindex', '-1');
  });

  it('is ONE stop in the page: Tab enters it, Tab leaves it', async () => {
    render(
      <>
        <button type="button">before</button>
        {three()}
        <button type="button">after</button>
      </>,
    );
    await waitFor(() => expect(stops()).toContain('Bold'));

    control('before').focus();
    await browser.tab();
    expect(document.activeElement).toBe(control('Bold'));

    // Not to Italic. Three controls, one stop — that is the whole pattern.
    await browser.tab();
    expect(document.activeElement).toBe(control('after'));
  });

  it('walks with the arrows, and wraps', async () => {
    render(three());
    await waitFor(() => expect(stops()).toContain('Bold'));

    control('Bold').focus();
    await browser.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(control('Italic'));

    await browser.keyboard('{ArrowRight}{ArrowRight}');
    // Past the end and round: the APG specifies the wrap, so a user holding an
    // arrow never hits a wall.
    expect(document.activeElement).toBe(control('Bold'));

    await browser.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(control('Underline'));
  });

  it('jumps to the ends with Home and End', async () => {
    render(three());
    await waitFor(() => expect(stops()).toContain('Bold'));

    control('Italic').focus();
    await browser.keyboard('{End}');
    expect(document.activeElement).toBe(control('Underline'));

    await browser.keyboard('{Home}');
    expect(document.activeElement).toBe(control('Bold'));
  });

  it('walks Up and Down when it runs vertically', async () => {
    render(three({ orientation: 'vertical' }));
    await waitFor(() => expect(stops()).toContain('Bold'));

    control('Bold').focus();
    await browser.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(control('Italic'));

    await browser.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(control('Bold'));

    // The inline arrows are not this bar's, so they stay the page's.
    await browser.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(control('Bold'));
  });

  it('follows the writing direction: in Arabic, ArrowLeft moves forward', async () => {
    renderUi(three(), { locale: 'ar' });
    await waitFor(() => expect(stops()).toContain('Bold'));

    control('Bold').focus();
    // The first control is on the RIGHT, so the arrow that moves along the bar
    // is the one that points into the text.
    await browser.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(control('Italic'));

    await browser.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(control('Bold'));
  });

  it('remembers where the user was', async () => {
    render(
      <>
        {three()}
        <button type="button">after</button>
      </>,
    );
    await waitFor(() => expect(stops()).toContain('Bold'));

    control('Bold').focus();
    await browser.keyboard('{ArrowRight}{ArrowRight}');
    expect(document.activeElement).toBe(control('Underline'));

    // The tab stop follows the FOCUS. Returning to the bar has to return to
    // where the user was; sending them back to the first control silently
    // discards every arrow press they made.
    await waitFor(() => expect(stops()).toEqual(['Underline']));

    await browser.tab();
    expect(document.activeElement).toBe(control('after'));
    await browser.tab({ shift: true });
    expect(document.activeElement).toBe(control('Underline'));
  });

  describe('the seam — what a control keeps when it joins the bar', () => {
    it('keeps its own handlers', async () => {
      const onClick = vi.fn();
      const onFocus = vi.fn();
      render(
        <Toolbar label="Formatting">
          <ToolbarItem>
            <button type="button" onClick={onClick} onFocus={onFocus}>
              Bold
            </button>
          </ToolbarItem>
        </Toolbar>,
      );
      await waitFor(() => expect(stops()).toContain('Bold'));

      // `cloneElement` props REPLACE the child's, so a bar that cloned an
      // `onFocus` of its own onto the control would drop this one and nothing
      // would say so. The bar listens on ITSELF instead, once.
      await browser.click(control('Bold'));
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onFocus).toHaveBeenCalled();
    });

    it('keeps its own ref', async () => {
      const seen: (HTMLElement | null)[] = [];
      function Harness() {
        const ref = useRef<HTMLButtonElement>(null);
        return (
          <Toolbar label="Formatting">
            <ToolbarItem>
              <button
                type="button"
                ref={(node) => {
                  ref.current = node;
                  seen.push(node);
                }}
              >
                Bold
              </button>
            </ToolbarItem>
          </Toolbar>
        );
      }
      render(<Harness />);

      // The control is where a consumer's ref belongs, because it is the
      // element they meant. The bar needs one too, and merging is the whole
      // reason `ToolbarItem` takes no `ref` of its own.
      await waitFor(() => expect(seen.filter(Boolean)).toHaveLength(1));
      expect(seen.filter(Boolean)[0]).toBe(control('Bold'));
    });

    it('keeps everything one of our own components brings', async () => {
      render(
        <Toolbar label="Formatting">
          <ToolbarItem>
            <Button variant="secondary">Bold</Button>
          </ToolbarItem>
          <ToolbarItem>
            <Button>Italic</Button>
          </ToolbarItem>
        </Toolbar>,
      );
      await waitFor(() => expect(stops()).toEqual(['Bold']));

      // There is no `ToolbarButton` here, and this is why: a `Button` on the
      // bar is a `Button`, variants and all. A component of our own that
      // restated half of it is the defect `NavGroup` shipped.
      expect(control('Bold').className).not.toBe(control('Italic').className);
      await browser.keyboard('{Tab}{ArrowRight}');
      expect(document.activeElement).toBe(control('Italic'));
    });

    it('leaves a control alone when there is no bar around it', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      render(
        <ToolbarItem>
          <button type="button">Loose</button>
        </ToolbarItem>,
      );

      // A misplaced part is worth a loud warning, not a blank page — and NOT a
      // `tabindex="-1"`, which would take a perfectly good button out of the
      // page's tab order on the way past.
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('used outside a <Toolbar>'),
      );
      expect(control('Loose')).not.toHaveAttribute('tabindex');
      warn.mockRestore();
    });
  });

  describe('a field on the bar keeps its arrows AND its own tab stop', () => {
    const withField = (
      <Toolbar label="Formatting">
        <ToolbarItem>
          <button type="button">Bold</button>
        </ToolbarItem>
        <ToolbarItem>
          <input type="text" aria-label="Font" defaultValue="Inter" />
        </ToolbarItem>
        <ToolbarItem>
          <button type="button">Italic</button>
        </ToolbarItem>
      </Toolbar>
    );

    it('leaves the caret keys alone', async () => {
      render(withField);
      await waitFor(() => expect(stops()).toContain('Bold'));

      const field = screen.getByRole('textbox', { name: 'Font' });
      field.focus();
      (field as HTMLInputElement).setSelectionRange(5, 5);

      await browser.keyboard('{ArrowLeft}');
      // The caret moved, and the focus did not. Taking these would leave a
      // search box on a toolbar with no way to move a caret at all.
      expect(document.activeElement).toBe(field);
      expect((field as HTMLInputElement).selectionStart).toBe(4);

      await browser.keyboard('{Home}');
      expect(document.activeElement).toBe(field);
    });

    it('is OFF the ring, so the arrows step over it', async () => {
      render(withField);
      await waitFor(() => expect(stops()).toContain('Bold'));

      control('Bold').focus();
      await browser.keyboard('{ArrowRight}');
      // Not onto the field. A control that keeps the arrows cannot also be a
      // stop on a ring the arrows drive — it would be a wall.
      expect(document.activeElement).toBe(control('Italic'));
    });

    it('is reached and left with Tab instead — the APG answer', async () => {
      render(
        <>
          <button type="button">before</button>
          {withField}
          <button type="button">after</button>
        </>,
      );
      // TWO stops on this bar, deliberately: the ring's one, and the field's.
      // That is the honest price of putting a field on a toolbar.
      await waitFor(() => expect(stops()).toEqual(['Bold', 'Font']));

      control('before').focus();
      await browser.tab();
      expect(document.activeElement).toBe(control('Bold'));
      await browser.tab();
      expect(document.activeElement).toBe(
        screen.getByRole('textbox', { name: 'Font' }),
      );
      await browser.tab();
      expect(document.activeElement).toBe(control('after'));
    });

    it('never strands the rest of the bar', async () => {
      // THE DEFECT THIS SPLIT EXISTS FOR, and it was a keyboard trap of the
      // worst kind: silent, permanent, and invisible to anyone holding a mouse.
      //
      // The first version left the field ON the ring and merely declined to act
      // on its keys. So the arrows moved onto the field; every arrow, Home and
      // End then did nothing; and because the tab stop follows the focus,
      // Shift+Tab came back to the FIELD. Bold and Italic could not be reached
      // by keyboard again for the rest of the session — WCAG 2.1.1, reachable
      // in four keystrokes from the shipped story.
      render(
        <>
          {withField}
          <button type="button">after</button>
        </>,
      );
      await waitFor(() => expect(stops()).toContain('Bold'));

      const field = screen.getByRole('textbox', { name: 'Font' });
      field.focus();
      await browser.keyboard('{ArrowRight}{Home}{End}');
      expect(document.activeElement).toBe(field);

      // Out and back: the ring's stop is still the ring's, not the field's.
      control('after').focus();
      await browser.tab({ shift: true });
      expect(document.activeElement).toBe(field);
      await browser.tab({ shift: true });
      expect(document.activeElement).toBe(control('Bold'));

      // And the ring still walks.
      await browser.keyboard('{ArrowRight}');
      expect(document.activeElement).toBe(control('Italic'));
    });
  });

  describe('the keys it does not take', () => {
    it('leaves the arrows to anything that is not on the ring', async () => {
      render(
        <Toolbar label="Formatting">
          <ToolbarItem>
            <button type="button">Bold</button>
          </ToolbarItem>
          <input type="search" aria-label="Filter" />
        </Toolbar>,
      );
      await waitFor(() => expect(stops()).toContain('Bold'));

      // Not wrapped, so not a part — the bar catches everything that bubbles
      // out of it and must drop what was never its business.
      const filter = screen.getByRole('searchbox', { name: 'Filter' });
      filter.focus();
      await browser.keyboard('{ArrowRight}');
      expect(document.activeElement).toBe(filter);
    });

    it('leaves a key something inside has already answered', async () => {
      render(
        <Toolbar label="Formatting">
          <ToolbarItem>
            <button
              type="button"
              onKeyDown={(event) => {
                event.preventDefault();
              }}
            >
              Bold
            </button>
          </ToolbarItem>
          <ToolbarItem>
            <button type="button">Italic</button>
          </ToolbarItem>
        </Toolbar>,
      );
      await waitFor(() => expect(stops()).toContain('Bold'));

      control('Bold').focus();
      await browser.keyboard('{ArrowRight}');
      expect(document.activeElement).toBe(control('Bold'));
    });
  });

  describe('the bar always has a way in', () => {
    it('keeps the tab stop when the control holding it leaves', async () => {
      function Harness() {
        const [extra, setExtra] = useState(true);
        return (
          <>
            <button type="button" onClick={() => setExtra(false)}>
              remove
            </button>
            <Toolbar label="Formatting">
              <ToolbarItem>
                <button type="button">Bold</button>
              </ToolbarItem>
              {extra ? (
                <ToolbarItem>
                  <button type="button">Italic</button>
                </ToolbarItem>
              ) : null}
            </Toolbar>
          </>
        );
      }
      render(<Harness />);
      await waitFor(() => expect(stops()).toContain('Bold'));

      control('Italic').focus();
      await waitFor(() => expect(stops()).toEqual(['Italic']));

      await browser.click(control('remove'));

      // Without this the stop goes with it: nothing renders `tabindex="0"` and
      // the whole bar drops out of the page's tab order — a bar of controls no
      // keyboard can reach, with nothing on screen to say so.
      //
      // Asserted as an EQUALITY on which control holds it, not as "the bar is
      // reachable somehow". The looser version passed while proving nothing:
      // "the bar has tabindex 0 OR exactly one control does" is true of almost
      // any state this component can be in.
      await waitFor(() => expect(stops()).toEqual(['Bold']));
      expect(screen.getByRole('toolbar')).toHaveAttribute('tabindex', '-1');

      control('remove').focus();
      await browser.tab();
      expect(document.activeElement).toBe(control('Bold'));
    });

    it('survives StrictMode taking every ref and effect twice', async () => {
      render(<StrictMode>{three()}</StrictMode>);

      // The tab stop is written by an effect onto elements a ref registered, so
      // the double mount is the case that would break it: a registration
      // detached and re-attached, an effect run twice. Worth a test of its own
      // because nothing else in this suite runs under StrictMode, and a
      // consumer's app almost certainly does.
      await waitFor(() => expect(stops()).toEqual(['Bold']));

      control('Bold').focus();
      await browser.keyboard('{ArrowRight}');
      expect(document.activeElement).toBe(control('Italic'));
      await waitFor(() => expect(stops()).toEqual(['Italic']));
    });

    it('stays focusable when it has no controls at all', async () => {
      render(<Toolbar label="Formatting">{null}</Toolbar>);

      // A bar whose controls are gated by a permission, still loading, or
      // hidden at a breakpoint has none. It keeps the focus and shows a ring:
      // a tab stop nobody can see is worse than one nobody wanted.
      const bar = screen.getByRole('toolbar');
      await waitFor(() => expect(bar).toHaveAttribute('tabindex', '0'));
      bar.focus();
      expect(document.activeElement).toBe(bar);
    });

    it('hands the focus straight on when it does have controls', async () => {
      render(three());
      const bar = screen.getByRole('toolbar');
      await waitFor(() => expect(stops()).toContain('Bold'));

      // A toolbar is not somewhere to stand.
      bar.focus();
      await waitFor(() => expect(document.activeElement).toBe(control('Bold')));
    });
  });

  describe('a natively disabled control is not the same as an aria-disabled one', () => {
    it('does not seed the tab stop onto one that cannot take focus', async () => {
      render(
        <>
          <button type="button">before</button>
          <Toolbar label="Formatting">
            <ToolbarItem>
              <button type="button" disabled>
                Bold
              </button>
            </ToolbarItem>
            <ToolbarItem>
              <button type="button">Italic</button>
            </ToolbarItem>
          </Toolbar>
        </>,
      );

      // The severe one. `tabindex="0"` on a disabled button is a tab stop no
      // keyboard can land on, so the whole bar drops out of the page's tab
      // order — a toolbar nobody can reach, with nothing on screen to say so.
      await waitFor(() => expect(stops()).toEqual(['Italic']));

      control('before').focus();
      await browser.tab();
      expect(document.activeElement).toBe(control('Italic'));
    });

    it('steps over one, because landing on it goes nowhere', async () => {
      render(
        <Toolbar label="Formatting">
          <ToolbarItem>
            <button type="button">Bold</button>
          </ToolbarItem>
          <ToolbarItem>
            <button type="button" disabled>
              Italic
            </button>
          </ToolbarItem>
          <ToolbarItem>
            <button type="button">Underline</button>
          </ToolbarItem>
        </Toolbar>,
      );
      await waitFor(() => expect(stops()).toContain('Bold'));

      control('Bold').focus();
      await browser.keyboard('{ArrowRight}');
      // `focus()` on a disabled element is a no-op, so a ring that lands there
      // is a ring that has stopped — the user presses the arrow again and
      // nothing happens.
      expect(document.activeElement).toBe(control('Underline'));
    });

    it('hands the stop back when a control is disabled while holding it', async () => {
      function Harness() {
        const [off, setOff] = useState(false);
        return (
          <>
            <button type="button" onClick={() => setOff(true)}>
              disable
            </button>
            <Toolbar label="Formatting">
              <ToolbarItem>
                <button type="button" disabled={off}>
                  Bold
                </button>
              </ToolbarItem>
              <ToolbarItem>
                <button type="button">Italic</button>
              </ToolbarItem>
            </Toolbar>
          </>
        );
      }
      render(<Harness />);
      await waitFor(() => expect(stops()).toEqual(['Bold']));

      await browser.click(control('disable'));

      // Same hole as an unmounted control, and harder to see: the element is
      // still there, still carrying the only `tabindex="0"` on the bar, and
      // nothing about the page looks wrong.
      await waitFor(() => expect(stops()).toEqual(['Italic']));

      control('disable').focus();
      await browser.tab();
      expect(document.activeElement).toBe(control('Italic'));
    });
  });

  it('walks ONTO an aria-disabled control rather than over it', async () => {
    render(
      <Toolbar label="Formatting">
        <ToolbarItem>
          <button type="button">Bold</button>
        </ToolbarItem>
        <ToolbarItem>
          <button type="button" aria-disabled="true">
            Italic
          </button>
        </ToolbarItem>
        <ToolbarItem>
          <button type="button">Underline</button>
        </ToolbarItem>
      </Toolbar>,
    );
    await waitFor(() => expect(stops()).toContain('Bold'));

    control('Bold').focus();
    await browser.keyboard('{ArrowRight}');
    // `aria-disabled` and focusable — the APG's "focusable but cannot be
    // activated". A control the arrows skip is one the reader is never told
    // exists.
    expect(document.activeElement).toBe(control('Italic'));
  });

  describe('the clone contract — what ToolbarItem demands of a control', () => {
    it('adds no element of its own', async () => {
      const { container } = render(
        <Toolbar label="Formatting">
          <ToolbarItem>
            <button type="button">Bold</button>
          </ToolbarItem>
        </Toolbar>,
      );

      // A `<div>` around every control would be an element that has not earned
      // its place, a second box between the bar's `gap` and the controls it
      // spaces, and a layer for a `role="toolbar"`'s children to hide behind.
      const bar = screen.getByRole('toolbar');
      expect(bar.children).toHaveLength(1);
      expect(bar.firstElementChild?.tagName).toBe('BUTTON');
      expect(container.querySelectorAll('div')).toHaveLength(1);
    });

    it('names the mistake when children cannot carry a ref', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      // THE CAST IS THE POINT. `children` is typed `ReactElement`, so bare text
      // is a compile error now and a consumer meets this at the keyboard rather
      // than in the console. The runtime guard stays for JavaScript, and for a
      // value that only turns out to be text at runtime — so it is reached here
      // the only way it can be.
      const Item = ToolbarItem as (props: { children: unknown }) => ReactNode;
      render(
        <Toolbar label="Formatting">
          <Item>just text</Item>
        </Toolbar>,
      );

      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('single element that accepts a ref'),
      );
      // Rendered anyway: a loud warning beats a blank page.
      expect(screen.getByRole('toolbar')).toHaveTextContent('just text');
      warn.mockRestore();
    });

    it('says so when the control brought a tabIndex of its own', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      render(
        <Toolbar label="Formatting">
          <ToolbarItem>
            <button type="button" tabIndex={0}>
              Bold
            </button>
          </ToolbarItem>
        </Toolbar>,
      );

      // Overwritten, because a toolbar is ONE tab stop and which control holds
      // it is the toolbar's to decide — but silently overwriting somebody's
      // explicit prop is how a consumer loses an afternoon.
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('sets its own `tabIndex`'),
      );
      warn.mockRestore();
    });

    it('is quiet when the control brings nothing to argue about', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      render(three());
      await waitFor(() => expect(stops()).toContain('Bold'));

      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  describe('the fact is on the DOM, so the DOM has to invalidate it', () => {
    /**
     * THE BLIND SPOT THIS WHOLE BLOCK EXISTS FOR.
     *
     * Every stateful fixture above holds its state ABOVE the `Toolbar`, so the
     * bar re-renders and its effect runs. Three independent reviews reproduced
     * the same catastrophe from the arrangement below — one component per
     * control, holding its own state, which is how anyone actually writes a
     * toolbar. The bar does not re-render, and a recompute driven by React's
     * schedule never happens.
     *
     * Each of these left the bar with NO tab stop at all: unreachable by
     * keyboard, recoverable only with a mouse, and with nothing on screen to
     * say so.
     */
    // The `ToolbarItem` is INSIDE the stateful component, which is the whole
    // point: the state that decides `disabled` lives below the bar, so nothing
    // re-renders the bar when it changes.
    function SelfDisabling() {
      const [off, setOff] = useState(false);
      return (
        <ToolbarItem>
          <button type="button" disabled={off} onClick={() => setOff(true)}>
            Bold
          </button>
        </ToolbarItem>
      );
    }

    it('re-homes the stop when a control disables ITSELF', async () => {
      render(
        <>
          <button type="button">before</button>
          <Toolbar label="Formatting">
            <SelfDisabling />
            <ToolbarItem>
              <button type="button">Italic</button>
            </ToolbarItem>
          </Toolbar>
        </>,
      );
      await waitFor(() => expect(stops()).toEqual(['Bold']));

      await browser.click(control('Bold'));

      await waitFor(() => expect(stops()).toEqual(['Italic']));
      control('before').focus();
      await browser.tab();
      expect(document.activeElement).toBe(control('Italic'));
    });

    it('re-homes the stop when a control unmounts ITSELF', async () => {
      function SelfRemoving() {
        const [gone, setGone] = useState(false);
        if (gone) return null;
        return (
          <ToolbarItem>
            <button type="button" onClick={() => setGone(true)}>
              Bold
            </button>
          </ToolbarItem>
        );
      }

      render(
        <>
          <button type="button">before</button>
          <Toolbar label="Formatting">
            <SelfRemoving />
            <ToolbarItem>
              <button type="button">Italic</button>
            </ToolbarItem>
          </Toolbar>
        </>,
      );
      await waitFor(() => expect(stops()).toEqual(['Bold']));

      await browser.click(control('Bold'));

      await waitFor(() => expect(stops()).toEqual(['Italic']));
    });

    it('re-homes the stop when CSS alone hides the control holding it', async () => {
      render(
        <Toolbar label="Formatting">
          <ToolbarItem>
            <button type="button">Bold</button>
          </ToolbarItem>
          <ToolbarItem>
            <button type="button">Italic</button>
          </ToolbarItem>
        </Toolbar>,
      );
      await waitFor(() => expect(stops()).toEqual(['Bold']));

      // No React anywhere in this line — which is the point. A media query
      // hiding a control at a breakpoint moves no tree and mutates no prop, and
      // it is the case both the component and its page promise by name.
      control('Bold').style.display = 'none';

      await waitFor(() => expect(stops()).toEqual(['Italic']));
    });

    it('does not seed the stop onto a control CSS has made unfocusable', async () => {
      render(
        <>
          <button type="button">before</button>
          <Toolbar label="Formatting">
            <ToolbarItem>
              <button type="button" style={{ visibility: 'hidden' }}>
                Bold
              </button>
            </ToolbarItem>
            <ToolbarItem>
              <button type="button">Italic</button>
            </ToolbarItem>
          </Toolbar>
        </>,
      );

      // `visibility: hidden` is unfocusable, and the registry deliberately does
      // NOT filter on it (a menu that has stepped aside is still the family the
      // focus returns to). Wrong on a toolbar, and wrong on the first paint
      // with no state change at all.
      await waitFor(() => expect(stops()).toEqual(['Italic']));
      control('before').focus();
      await browser.tab();
      expect(document.activeElement).toBe(control('Italic'));
    });

    it('carries the focus with the stop when the ground goes', async () => {
      function Harness() {
        const [gone, setGone] = useState(false);
        return (
          <>
            <button type="button" onClick={() => setGone(true)}>
              remove
            </button>
            <Toolbar label="Formatting">
              {gone ? null : (
                <ToolbarItem>
                  <button type="button">Bold</button>
                </ToolbarItem>
              )}
              <ToolbarItem>
                <button type="button">Italic</button>
              </ToolbarItem>
            </Toolbar>
          </>
        );
      }
      render(<Harness />);
      await waitFor(() => expect(stops()).toEqual(['Bold']));

      // FOCUS ON THE CONTROL THAT IS ABOUT TO GO — which is what the earlier
      // removal tests never did: they clicked a button outside the bar first,
      // moving the focus off the departing control and hiding the defect.
      control('Bold').focus();
      expect(document.activeElement).toBe(control('Bold'));

      const remove = screen.getByRole('button', { name: 'remove' });
      remove.click();

      // Not `<body>`. Dropping to it restarts the next Tab at the top of the
      // document and loses a screen reader's place entirely.
      await waitFor(() =>
        expect(document.activeElement).toBe(control('Italic')),
      );
    });

    it('does not steal the focus when it was never inside the bar', async () => {
      function Harness() {
        const [gone, setGone] = useState(false);
        return (
          <>
            <button type="button" onClick={() => setGone(true)}>
              remove
            </button>
            <Toolbar label="Formatting">
              {gone ? null : (
                <ToolbarItem>
                  <button type="button">Bold</button>
                </ToolbarItem>
              )}
              <ToolbarItem>
                <button type="button">Italic</button>
              </ToolbarItem>
            </Toolbar>
          </>
        );
      }
      render(<Harness />);
      await waitFor(() => expect(stops()).toEqual(['Bold']));

      // The other half of the re-homing rule, and the one that would be a bug
      // in the opposite direction: a toolbar that grabs the focus because
      // something in it changed while the user was reading somewhere else.
      const remove = screen.getByRole('button', { name: 'remove' });
      remove.focus();
      await browser.click(remove);

      await waitFor(() => expect(stops()).toEqual(['Italic']));
      expect(document.activeElement).toBe(remove);
    });

    it('returns to where the user was when the bar itself is clicked', async () => {
      render(three());
      await waitFor(() => expect(stops()).toEqual(['Bold']));

      control('Bold').focus();
      await browser.keyboard('{ArrowRight}{ArrowRight}');
      expect(document.activeElement).toBe(control('Underline'));

      // A `tabindex="-1"` element is click-focusable, and a flex bar with a gap
      // is mostly empty space. Sending them to the first control would discard
      // every arrow they pressed — the same guarantee as tabbing away and back.
      screen.getByRole('toolbar').focus();
      await waitFor(() =>
        expect(document.activeElement).toBe(control('Underline')),
      );
    });
  });

  describe('the ways a control silently never joins the ring', () => {
    it('says so when the control drops the ref', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      // A consumer's own wrapper that forgets to forward its ref: a valid
      // element, no `tabIndex` of its own, and in React 19 a dropped `ref` is
      // not a mistake React can see. Before the deferred guard this produced
      // ZERO output and a bar with two tab stops.
      function Plain() {
        return <button type="button">Bold</button>;
      }

      render(
        <Toolbar label="Formatting">
          <ToolbarItem>
            <Plain />
          </ToolbarItem>
        </Toolbar>,
      );

      await waitFor(() =>
        expect(warn).toHaveBeenCalledWith(
          expect.stringContaining('never received a ref'),
        ),
      );
      warn.mockRestore();
    });

    it('says so when the ref lands on something unfocusable', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      // What every labelled control in this package does: `ChoiceField`,
      // `InputGroup` and a plain `<label>` all forward their ref to a wrapper.
      // The toolbar would write its tab stop onto a `<div>` with no role and no
      // name, while the real control kept a stop of its own.
      render(
        <Toolbar label="Formatting">
          <ToolbarItem>
            <div>
              <button type="button">Bold</button>
            </div>
          </ToolbarItem>
        </Toolbar>,
      );

      await waitFor(() =>
        expect(warn).toHaveBeenCalledWith(
          expect.stringContaining('cannot be focused'),
        ),
      );
      warn.mockRestore();
    });

    it('says so for a fragment, which `isValidElement` calls valid', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      // Built rather than written as `<>…</>`, because a single-child fragment
      // is exactly what the lint rule calls useless — and a useless fragment is
      // precisely the mistake under test.
      const wrapped = createElement(
        Fragment,
        null,
        <button type="button">Bold</button>,
      );
      render(
        <Toolbar label="Formatting">
          <ToolbarItem>{wrapped}</ToolbarItem>
        </Toolbar>,
      );

      await waitFor(() =>
        expect(warn).toHaveBeenCalledWith(
          expect.stringContaining('never received a ref'),
        ),
      );
      warn.mockRestore();
    });
  });

  it('composes with a Tooltip, which is the archetypal toolbar button', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    // TWO components that each clone a single child cannot both reach the same
    // node by cloning it — so the outer one has to hand its props THROUGH the
    // inner one, which is why `ToolbarItem` passes on what it is given. The
    // other order cannot work in either direction and warns.
    render(
      <Toolbar label="Formatting">
        <Tooltip content="Bold (⌘B)">
          <ToolbarItem>
            <button type="button">Bold</button>
          </ToolbarItem>
        </Tooltip>
        <ToolbarItem>
          <button type="button">Italic</button>
        </ToolbarItem>
      </Toolbar>,
    );

    await waitFor(() => expect(stops()).toEqual(['Bold']));
    // The tooltip's own wiring survived the trip through `ToolbarItem`…
    expect(control('Bold')).toHaveAttribute('aria-describedby');
    // …and the button is on the ring rather than being a second tab stop.
    control('Bold').focus();
    await browser.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(control('Italic'));
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  describe('ToolbarSeparator lies ACROSS the bar', () => {
    const grouped = (
      props: Partial<React.ComponentProps<typeof Toolbar>> = {},
    ) => (
      <Toolbar label="Text formatting" {...props}>
        <ToolbarItem>
          <button type="button">Bold</button>
        </ToolbarItem>
        <ToolbarSeparator />
        <ToolbarItem>
          <button type="button">Left</button>
        </ToolbarItem>
      </Toolbar>
    );

    it('runs vertically inside a bar that runs across', async () => {
      render(grouped());

      // `role="separator"` defaults to horizontal, so a line drawn DOWN a bar
      // that runs ACROSS has to say so or be announced as the thing it is not.
      // Getting this backwards is invisible, which is why it is not a prop.
      const rule = screen.getByRole('separator');
      expect(rule).toHaveAttribute('aria-orientation', 'vertical');
      expect(rule).toHaveAttribute('data-orientation', 'vertical');
    });

    it('runs horizontally inside a bar that runs down', async () => {
      render(grouped({ orientation: 'vertical' }));

      // And says nothing, because horizontal is what the role already means.
      const rule = screen.getByRole('separator');
      expect(rule).not.toHaveAttribute('aria-orientation');
      expect(rule).toHaveAttribute('data-orientation', 'horizontal');
    });

    it('is a thing to see, not a thing to reach', async () => {
      render(grouped());
      await waitFor(() => expect(stops()).toEqual(['Bold']));

      // It joins no family and takes no focus, so the ring walks straight over
      // it and it is never a tab stop of its own.
      control('Bold').focus();
      await browser.keyboard('{ArrowRight}');
      expect(document.activeElement).toBe(control('Left'));
      expect(stops()).toEqual(['Left']);
    });

    it('is a plain rule with no bar around it', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      render(<ToolbarSeparator />);

      // Nothing to be across, and a horizontal rule is what an `<hr>` already
      // is — but the misplaced part still says so by name.
      expect(screen.getByRole('separator')).not.toHaveAttribute(
        'aria-orientation',
      );
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('used outside a <Toolbar>'),
      );
      warn.mockRestore();
    });
  });

  it('has no axe violations', async () => {
    const { container } = render(three());
    await waitFor(() => expect(stops()).toContain('Bold'));
    await expectNoA11yViolations(container);
  });

  it('has no axe violations when it runs vertically', async () => {
    // Both variants, like the tab list: `aria-orientation` is only written in
    // this one, so the horizontal run cannot prove it.
    const { container } = render(three({ orientation: 'vertical' }));
    await waitFor(() => expect(stops()).toContain('Bold'));
    await expectNoA11yViolations(container);
  });

  describe('what the item does to the control it wraps', () => {
    // `ToolbarItemProps` is two props wide — `children` and `ref` — so there is
    // nothing of the wrapper's to contend with the control's, and the prop
    // precedence that kept this component out of `Slot` had no object at all.
    // A first version of this block asserted that a wrapper `className` merged;
    // the type does not allow one, and only `tsc` could say so — the test run
    // was green.
    it('still writes the roving tabindex onto the node', async () => {
      // The reason the item could go through `Slot` at all. The bar writes this
      // attribute on the DOM node, never through props, so prop precedence was
      // never what protected the keyboard model — a claim made here first and
      // then measured, which is the only reason this migration was possible.
      render(
        <Toolbar label="Format">
          <ToolbarItem>
            <button type="button">Bold</button>
          </ToolbarItem>
          <ToolbarItem>
            <button type="button">Italic</button>
          </ToolbarItem>
        </Toolbar>,
      );
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Bold' })).toHaveAttribute(
          'tabindex',
          '0',
        ),
      );
      expect(screen.getByRole('button', { name: 'Italic' })).toHaveAttribute(
        'tabindex',
        '-1',
      );
    });
  });
});

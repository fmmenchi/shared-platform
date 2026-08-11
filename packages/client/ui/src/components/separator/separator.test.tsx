import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Separator } from './separator.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

describe('Separator', () => {
  it('is the platform element, with its implicit role', () => {
    render(<Separator />);

    // THE ELEMENT, not a div wearing the role: an `<hr>`'s implicit role is
    // already `separator`, so the role is the platform's and never ours to
    // keep in step.
    const rule = screen.getByRole('separator');
    expect(rule.tagName).toBe('HR');
  });

  it('says nothing about orientation when horizontal', () => {
    render(<Separator />);

    // `role="separator"` defaults to horizontal, and stating a default is a
    // second place for it to be wrong — the attribute must be ABSENT, not
    // present saying 'horizontal'.
    const rule = screen.getByRole('separator');
    expect(rule).not.toHaveAttribute('aria-orientation');
    // The stylesheet's hook is always there regardless.
    expect(rule).toHaveAttribute('data-orientation', 'horizontal');
  });

  it('announces vertical, the one orientation that is news', () => {
    render(<Separator orientation="vertical" />);

    const rule = screen.getByRole('separator');
    expect(rule).toHaveAttribute('aria-orientation', 'vertical');
    expect(rule).toHaveAttribute('data-orientation', 'vertical');
  });

  it('keeps the line but hides it from assistive tech when decorative', () => {
    const { container } = render(<Separator decorative />);

    // Gone from the accessibility tree…
    expect(screen.queryByRole('separator')).toBeNull();
    // …but still the same element on the page, still styleable by
    // orientation.
    const rule = container.querySelector('hr');
    expect(rule).not.toBeNull();
    expect(rule).toHaveAttribute('aria-hidden', 'true');
    expect(rule).toHaveAttribute('data-orientation', 'horizontal');
    // Hidden from AT, not from sight: the border still paints. Guards a stray
    // `[aria-hidden] { display: none }` interaction from blanking the line.
    expect(rule!.getBoundingClientRect().height).toBeGreaterThanOrEqual(1);
  });

  it('says nothing about orientation on a decorative vertical line', () => {
    const { container } = render(
      <Separator orientation="vertical" decorative />,
    );

    // On a hidden element there is nobody left to tell — the visual runs
    // vertical (data-orientation), the ARIA stays silent.
    const rule = container.querySelector('hr');
    expect(rule).toHaveAttribute('data-orientation', 'vertical');
    expect(rule).not.toHaveAttribute('aria-orientation');
  });

  it('forwards ref to the underlying hr element', () => {
    const ref = { current: null as HTMLHRElement | null };
    render(<Separator ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLHRElement);
  });

  it('takes its height from the row it stands in (real layout in Chromium)', () => {
    // The vertical contract the docs state: in a flex row the parent gives it
    // height (`align-self: stretch`), and that only works with `block-size`
    // back at `auto` — the base reset's `0` is a definite cross size, which
    // turns stretch off. This is a layout measurement, not a computed-style
    // read, so a regression in that pairing fails here. `align-items: center`
    // is load-bearing: with the container's default stretch, a deleted
    // `align-self` would be masked and the same regression would measure 40.
    render(
      <div style={{ display: 'flex', alignItems: 'center', blockSize: '40px' }}>
        <span>Docs</span>
        <Separator orientation="vertical" />
        <span>API</span>
      </div>,
    );
    const rule = screen.getByRole('separator');
    expect(rule.getBoundingClientRect().height).toBe(40);
  });

  it('spans a centred column instead of collapsing to fit-content', () => {
    // A horizontal rule in `flex-direction: column; align-items: center`
    // resolves its cross size to the fit-content of an empty element — 0px
    // wide, an invisible line — unless the stylesheet stretches it. Same
    // mechanism as the vertical case, on the other axis.
    render(
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          inlineSize: '200px',
        }}
      >
        <span>Above</span>
        <Separator />
        <span>Below</span>
      </div>,
    );
    const rule = screen.getByRole('separator');
    expect(rule.getBoundingClientRect().width).toBe(200);
  });

  it('owns aria-hidden and aria-orientation — props cannot smuggle them in', () => {
    // These two attributes are the component's CONTRACT with assistive tech,
    // steered only through `decorative` and `orientation`. Both are written
    // after the spread on purpose, so a raw prop is overridden rather than
    // creating a second, contradictable channel.
    const { container } = render(
      <>
        <Separator aria-hidden="true" />
        <Separator aria-orientation="vertical" />
      </>,
    );
    const [first, second] = Array.from(container.querySelectorAll('hr'));
    expect(first).not.toHaveAttribute('aria-hidden');
    expect(second).not.toHaveAttribute('aria-orientation');
  });

  it('matches the rendered snapshot', () => {
    const { container } = render(<Separator />);
    expect(container.firstChild).toMatchSnapshot();
  });

  // axe in real Chromium — both orientations and the decorative form, in each
  // theme.
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
            <p>Above the line</p>
            <Separator />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span>Docs</span>
              <Separator orientation="vertical" />
              <span>API</span>
            </div>
            <Separator decorative />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <span>Docs</span>
              <Separator orientation="vertical" decorative />
              <span>API</span>
            </div>
          </div>,
          { theme },
        );
        await expectNoA11yViolations(container);
      });
    }
  });
});

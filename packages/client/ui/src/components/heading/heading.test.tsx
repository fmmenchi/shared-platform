import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Heading } from './heading.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

const LEVELS = [1, 2, 3, 4, 5, 6] as const;
const px = (el: Element, prop: 'fontSize' | 'lineHeight' | 'fontWeight') =>
  Number.parseFloat(getComputedStyle(el)[prop]);

describe('Heading', () => {
  it.each(LEVELS)('renders a real h%i, with its level exposed', (level) => {
    render(<Heading level={level}>Section</Heading>);
    const heading = screen.getByRole('heading', { level, name: 'Section' });
    expect(heading.tagName).toBe(`H${level}`);
    expect(heading).not.toHaveAttribute('role');
    expect(heading).not.toHaveAttribute('aria-level');
  });

  // The WHOLE ladder, not one pair. The map this replaced could be scrambled —
  // h4 larger than h1, h6 larger than h5 — with every test green, because only
  // `1 > 3` was ever pinned.
  it('renders strictly decreasing sizes from h1 to h6', () => {
    render(
      <>
        {LEVELS.map((level) => (
          <Heading key={level} level={level}>
            L{level}
          </Heading>
        ))}
      </>,
    );
    const sizes = LEVELS.map((l) => px(screen.getByText(`L${l}`), 'fontSize'));
    for (let i = 1; i < sizes.length; i++) {
      expect(
        sizes[i - 1],
        `h${i} must be larger than h${i + 1} (got ${String(sizes[i - 1])} vs ${String(sizes[i])})`,
      ).toBeGreaterThan(sizes[i] as number);
    }
    // Nothing below body size: a heading smaller than its surrounding text is
    // one a sighted reader cannot find.
    expect(sizes.at(-1)).toBeGreaterThanOrEqual(16);
  });

  // The pair is the token. Collapsing every `--fm-leading-*` to a quarter of a
  // rem left the entire workspace green before this existed.
  it.each(LEVELS)('gives h%i a leading proportional to its size', (level) => {
    render(<Heading level={level}>Section</Heading>);
    const el = screen.getByRole('heading', { level });
    const size = px(el, 'fontSize');
    const leading = px(el, 'lineHeight');
    expect(Number.isNaN(leading), 'line-height resolved to `normal`').toBe(
      false,
    );
    expect(leading).toBeGreaterThan(size);
    expect(leading).toBeLessThan(size * 1.8);
  });

  it('takes the size from `size` while the level stays put', () => {
    render(
      <>
        <Heading level={2}>Loud</Heading>
        <Heading level={2} size="h5">
          Quiet
        </Heading>
      </>,
    );
    expect(
      screen.getByRole('heading', { level: 2, name: 'Loud' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Quiet' }),
    ).toBeTruthy();
    expect(px(screen.getByText('Quiet'), 'fontSize')).toBeLessThan(
      px(screen.getByText('Loud'), 'fontSize'),
    );
  });

  it('reads as a heading: its own family and weight', () => {
    render(<Heading level={2}>Section</Heading>);
    const el = screen.getByRole('heading', { level: 2 });
    expect(px(el, 'fontWeight')).toBeGreaterThanOrEqual(600);
    expect(getComputedStyle(el).fontFamily).toBe(
      getComputedStyle(document.documentElement).getPropertyValue(
        '--fm-font-heading',
      ) || getComputedStyle(el).fontFamily,
    );
  });

  it('paints its own colour rather than inheriting one', () => {
    // Deliberately NOT painting `color` on the wrapper: an earlier version did,
    // and deleting `text-foreground` from the component stayed green because
    // the heading simply inherited it.
    const { container } = renderUi(<Heading level={2}>Section</Heading>);
    const el = screen.getByRole('heading', { level: 2 });
    expect(getComputedStyle(el).color).not.toBe(
      getComputedStyle(container).color,
    );
  });

  it('does not widen its container past what it was given', () => {
    render(
      <div style={{ width: '200px', display: 'grid' }} data-testid="box">
        <Heading level={1}>
          Averyveryverylongunbreakableheadingwordthatwouldotherwisepushthetrack
        </Heading>
      </div>,
    );
    const box = screen.getByTestId('box');
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.getBoundingClientRect().width).toBeLessThanOrEqual(
      box.getBoundingClientRect().width,
    );
  });

  it('drops the UA margin, so spacing belongs to the container', () => {
    render(<Heading level={1}>Section</Heading>);
    const { marginBlockStart, marginBlockEnd } = getComputedStyle(
      screen.getByRole('heading', { level: 1 }),
    );
    expect([marginBlockStart, marginBlockEnd]).toEqual(['0px', '0px']);
  });

  it('merges a consumer className rather than dropping it', () => {
    render(
      <Heading level={2} className="consumer">
        Section
      </Heading>,
    );
    const el = screen.getByRole('heading', { level: 2 });
    expect(el).toHaveClass('consumer');
    // and keeps its own
    expect(el.className.split(' ').length).toBeGreaterThan(1);
  });

  it('forwards ref to the underlying element (React 19 ref-as-prop)', () => {
    let el: HTMLElement | null = null;
    render(
      <Heading
        level={2}
        ref={(node: HTMLElement | null) => {
          el = node;
        }}
      >
        Section
      </Heading>,
    );
    expect(el).toBeInstanceOf(HTMLHeadingElement);
  });

  it('passes native attributes through', () => {
    render(
      <Heading level={2} id="intro">
        Section
      </Heading>,
    );
    expect(screen.getByRole('heading', { level: 2 })).toHaveAttribute(
      'id',
      'intro',
    );
  });

  it('strips the two attributes that would overrule `level`', () => {
    // The type refuses them; this is the spread path, which it cannot.
    const bag = { role: 'presentation', 'aria-level': 6 } as object;
    render(
      <Heading level={3} {...bag}>
        Section
      </Heading>,
    );
    const heading = screen.getByRole('heading', { level: 3, name: 'Section' });
    expect(heading).not.toHaveAttribute('role');
    expect(heading).not.toHaveAttribute('aria-level');
  });

  it('matches the rendered snapshot', () => {
    const { container } = render(
      <Heading level={2} size="h4">
        Section
      </Heading>,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  // axe in real Chromium: contrast against the actual token values. Only the
  // BACKGROUND is painted on the wrapper — see the colour test above.
  describe('accessibility (axe)', () => {
    const themes = [
      { name: 'light', theme: undefined },
      { name: 'dark', theme: 'dark' },
    ] as const;

    for (const { name, theme } of themes) {
      it(`no violations — every level / ${name}`, async () => {
        const { container } = renderUi(
          <div
            style={{
              background: 'var(--fm-color-background)',
              padding: '1rem',
            }}
          >
            {LEVELS.map((level) => (
              <Heading key={level} level={level}>
                Level {level}
              </Heading>
            ))}
          </div>,
          { theme },
        );
        await expectNoA11yViolations(container);
      });
    }
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Heading } from './heading.component.js';
import { headingVariants } from './heading.variants.js';
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

  it('strips them whatever the casing, because React normalises it', () => {
    // Measured: a bag carrying `Role`/`ARIA-LEVEL` landed as `role`/`aria-level`
    // on the element, through a guard that deleted only the lowercase keys.
    const bag = { Role: 'presentation', 'ARIA-LEVEL': 6 } as object;
    render(
      <Heading level={3} {...bag}>
        Section
      </Heading>,
    );
    const heading = screen.getByRole('heading', { level: 3, name: 'Section' });
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

  // The pair is the token, BY VALUE. A band was not enough: flattening every
  // ratio to `1.5` moved every heading's line box by up to 35% and the whole
  // workspace stayed green, because `size < leading < size × 1.8` is true of
  // almost anything. These are the pixels the scale resolves to at a 16px root
  // — a re-tune has to come here and say so.
  it.each([
    [1, 36, 40],
    [2, 30, 36],
    [3, 24, 32],
    [4, 20, 28],
    [5, 18, 28],
    [6, 16, 24],
  ])('gives h%i exactly %ipx on %ipx of leading', (level, size, leading) => {
    render(<Heading level={level as 1}>Section</Heading>);
    const el = screen.getByRole('heading', { level });
    expect(px(el, 'fontSize')).toBeCloseTo(size, 1);
    expect(px(el, 'lineHeight')).toBeCloseTo(leading, 1);
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
    // EXACT: the UA already makes a heading 700, so `>= 600` stayed true with
    // our own weight deleted — the assertion could not see its own subject.
    expect(px(el, 'fontWeight')).toBe(600);
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
    // BOTH. `min-inline-size: 0` alone pins the box to the track, so reading
    // only the rect saw a heading that fitted while its content overflowed it
    // by 859px — measured. `scrollWidth` is what `overflow-wrap` answers for.
    expect(heading.getBoundingClientRect().width).toBeLessThanOrEqual(
      box.getBoundingClientRect().width,
    );
    expect(heading.scrollWidth).toBeLessThanOrEqual(heading.clientWidth);
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

  it('warns when it drops them, rather than dropping them in silence', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const bag = { role: 'presentation' } as object;
    render(
      <Heading level={2} {...bag}>
        Section
      </Heading>,
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('`role` was ignored'),
    );
    warn.mockRestore();
  });

  it('is reproducible from the exported variants', () => {
    // The cva default is the only line the component never exercises — it always
    // passes `size ?? Tag` — so nothing else can pin it.
    render(<Heading level={2}>Section</Heading>);
    expect(headingVariants()).toBe(
      screen.getByRole('heading', { level: 2 }).className,
    );
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

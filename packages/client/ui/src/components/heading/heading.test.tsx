import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Heading } from './heading.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

const LEVELS = [1, 2, 3, 4, 5, 6] as const;

describe('Heading', () => {
  it.each(LEVELS)('renders a real h%i, with its level exposed', (level) => {
    render(<Heading level={level}>Section</Heading>);
    // By ROLE and level: this is the thing assistive tech navigates by, and an
    // assertion on the tag alone would pass for a div with an aria-level.
    const heading = screen.getByRole('heading', { level, name: 'Section' });
    expect(heading.tagName).toBe(`H${level}`);
    // No ARIA needed — the element already says it.
    expect(heading).not.toHaveAttribute('role');
    expect(heading).not.toHaveAttribute('aria-level');
  });

  it('sizes each level from the scale by default', () => {
    render(
      <>
        <Heading level={1}>One</Heading>
        <Heading level={3}>Three</Heading>
      </>,
    );
    const sizeOf = (name: string) =>
      getComputedStyle(screen.getByText(name)).fontSize;
    // The point is the ORDER, not the literal px: a re-tuned scale must not
    // break this test, an inverted one must.
    expect(Number.parseFloat(sizeOf('One'))).toBeGreaterThan(
      Number.parseFloat(sizeOf('Three')),
    );
  });

  it('takes the size from `size` while the level stays put', () => {
    render(
      <>
        <Heading level={2}>Loud</Heading>
        <Heading level={2} size="base">
          Quiet
        </Heading>
      </>,
    );
    // Both are still h2 — the outline did not move to serve the visual.
    expect(
      screen.getByRole('heading', { level: 2, name: 'Loud' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Quiet' }),
    ).toBeTruthy();
    expect(
      Number.parseFloat(getComputedStyle(screen.getByText('Quiet')).fontSize),
    ).toBeLessThan(
      Number.parseFloat(getComputedStyle(screen.getByText('Loud')).fontSize),
    );
  });

  it('drops the UA margin, so spacing belongs to the container', () => {
    render(<Heading level={1}>Section</Heading>);
    const { marginBlockStart, marginBlockEnd } = getComputedStyle(
      screen.getByRole('heading', { level: 1 }),
    );
    expect([marginBlockStart, marginBlockEnd]).toEqual(['0px', '0px']);
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
      <Heading level={2} id="intro" data-testid="h">
        Section
      </Heading>,
    );
    expect(screen.getByRole('heading', { level: 2 })).toHaveAttribute(
      'id',
      'intro',
    );
  });

  it('matches the rendered snapshot', () => {
    const { container } = render(
      <Heading level={2} size="lg">
        Section
      </Heading>,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  // axe in real Chromium, so contrast is checked against the actual token
  // values. The surface is PAINTED rather than assumed: `renderUi` sets the
  // theme but not a background, so an unpainted container leaves the heading's
  // `foreground` on the page's white in both themes — which axe correctly
  // failed the first time this was written. `background × foreground` is the
  // pairing this component actually claims.
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
              color: 'var(--fm-color-foreground)',
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

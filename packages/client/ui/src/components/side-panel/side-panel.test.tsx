import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { SidePanel } from './side-panel.component.js';
import { Button } from '../button/button.component.js';
import { Heading } from '../heading/heading.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

describe('SidePanel', () => {
  it('is a named complementary landmark', () => {
    // The name is the point of the required prop: two unnamed asides give a
    // screen reader user a list of things all called "complementary".
    render(<SidePanel label="Preview">Content</SidePanel>);

    expect(
      screen.getByRole('complementary', { name: 'Preview' }),
    ).toBeInTheDocument();
  });

  it('lets a visible heading name it instead, and that name wins', () => {
    // `aria-label` is written BEFORE the spread for this: a consumer with a
    // better name — the words already on screen — outranks the prop.
    render(
      <SidePanel label="ignored" aria-labelledby="panel-title">
        <Heading level={2} id="panel-title">
          Your theme
        </Heading>
      </SidePanel>,
    );

    expect(
      screen.getByRole('complementary', { name: 'Your theme' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: 'ignored' })).toBeNull();
  });

  describe('the boundary with a drawer — ADR-0034', () => {
    it('is not a dialog and never becomes modal', () => {
      // The whole reason this component exists rather than a `side` on
      // `DialogContent`. If it ever grew a `<dialog>` underneath, this is what
      // would say so.
      render(<SidePanel label="Preview">Content</SidePanel>);
      const panel = screen.getByRole('complementary', { name: 'Preview' });

      expect(panel.tagName).toBe('ASIDE');
      expect(panel.matches(':modal')).toBe(false);
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('leaves the content beside it usable, which a drawer would not', async () => {
      // A modal makes the rest of the page inert, so this asserts the property
      // the feature depends on: you may look at the panel AND keep working.
      render(
        <div>
          <Button>Keep editing</Button>
          <SidePanel label="Preview">Content</SidePanel>
        </div>,
      );

      const button = screen.getByRole('button', { name: 'Keep editing' });
      // `inert` is what `showModal()` sets on everything else; nothing here
      // should have set it.
      expect(button.closest('[inert]')).toBeNull();

      await browser.click(button);
      expect(document.activeElement).toBe(button);
    });

    it('is reachable by keyboard, because a scroll region that is not cannot be scrolled', async () => {
      // axe found this, not a person: `scrollable-region-focusable`. A panel
      // that scrolls and holds nothing focusable has no tab stop, so the arrow
      // keys have nowhere to go and a keyboard cannot scroll it at all.
      render(
        <div style={{ blockSize: '4rem' }}>
          <SidePanel label="Preview">
            <p>Text with nothing focusable in it.</p>
          </SidePanel>
        </div>,
      );
      const panel = screen.getByRole('complementary', { name: 'Preview' });

      expect(panel.tabIndex).toBe(0);
      panel.focus();
      expect(document.activeElement).toBe(panel);
    });

    it('lets a consumer take that tab stop away', () => {
      // Written before the spread, so it is a default and not a decree — a
      // panel that provably cannot scroll may drop out of the tab order.
      render(
        <SidePanel label="Preview" tabIndex={-1}>
          Content
        </SidePanel>,
      );

      expect(
        screen.getByRole('complementary', { name: 'Preview' }).tabIndex,
      ).toBe(-1);
    });

    it('contains its own overscroll, so the page behind does not move', () => {
      render(<SidePanel label="Preview">Content</SidePanel>);
      const panel = screen.getByRole('complementary', { name: 'Preview' });

      // The one way a non-modal panel can still disturb what it sits beside:
      // scroll chaining when it reaches its end. A modal has a scroll lock
      // instead; this is the non-modal equivalent, and it is CSS.
      const style = getComputedStyle(panel);
      expect(style.overflowY).toBe('auto');
      expect(style.overscrollBehaviorBlock).toBe('contain');
    });
  });

  it('merges a consumer class rather than replacing its own', () => {
    render(
      <SidePanel label="Preview" className="mine">
        Content
      </SidePanel>,
    );
    const panel = screen.getByRole('complementary', { name: 'Preview' });

    expect(panel).toHaveClass('mine');
    // and still has its own, or the surface would vanish on any consumer that
    // passes a class
    expect(panel.className.split(' ').length).toBeGreaterThan(1);
  });

  it('forwards ref to the underlying element (React 19 ref-as-prop)', () => {
    let el: HTMLElement | null = null;
    render(
      <SidePanel
        label="Preview"
        ref={(node) => {
          el = node;
        }}
      >
        Content
      </SidePanel>,
    );
    expect(el).toBeInstanceOf(HTMLElement);
  });

  it('matches the rendered snapshot', () => {
    const { container } = render(
      <SidePanel label="Preview">Content</SidePanel>,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  // axe in real Chromium — in each theme. No variant loop: the panel has one
  // treatment, so a variant axis would be an axis with one value.
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
            <SidePanel label="Preview" aria-labelledby="axe-title">
              <Heading level={2} id="axe-title">
                Your theme
              </Heading>
              <p style={{ margin: 0 }}>Body text on the panel.</p>
            </SidePanel>
          </div>,
          { theme },
        );
        await expectNoA11yViolations(container);
      });
    }
  });
});

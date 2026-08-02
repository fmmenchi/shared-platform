import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MenuTrigger } from './menu-trigger.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

describe('MenuTrigger', () => {
  it('renders its content with the right semantics', () => {
    render(<MenuTrigger>Content</MenuTrigger>);
    // TODO: query by ROLE and accessible name, not by test-id.
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('forwards ref to the underlying element (React 19 ref-as-prop)', () => {
    // Every component must be as reachable as the element it wraps — focus,
    // measurement, anchoring an overlay, a form lib's ref all depend on it. A
    // callback ref stays type-correct whatever element the component renders.
    let el: HTMLElement | null = null;
    render(
      <MenuTrigger
        ref={(node) => {
          el = node;
        }}
      >
        Content
      </MenuTrigger>,
    );
    expect(el).toBeInstanceOf(HTMLElement);
  });

  it('matches the rendered snapshot', () => {
    const { container } = render(
      <MenuTrigger variant="primary">Content</MenuTrigger>,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  // axe in real Chromium — every variant, in each theme.
  describe('accessibility (axe)', () => {
    const variants = ['primary'] as const;
    const themes = [
      { name: 'light', theme: undefined },
      { name: 'dark', theme: 'dark' },
    ] as const;

    for (const { name, theme } of themes) {
      for (const variant of variants) {
        it(`has no violations — ${variant} / ${name}`, async () => {
          const { container } = renderUi(
            <div
              style={{
                background: 'var(--fm-color-background)',
                color: 'var(--fm-color-foreground)',
                padding: '1rem',
              }}
            >
              <MenuTrigger variant={variant}>Content</MenuTrigger>
            </div>,
            { theme },
          );
          await expectNoA11yViolations(container);
        });
      }
    }
  });
});

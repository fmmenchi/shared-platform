import { describe, it, expect } from 'vitest';
import { render, within } from '@testing-library/react';
import { Skeleton } from './skeleton.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

/**
 * The one element it renders. Found by the attribute that defines it rather
 * than by role, because having no role is the point — there is nothing else
 * in the tree carrying `aria-hidden`.
 */
const box = (container: HTMLElement) =>
  container.querySelector('[aria-hidden="true"]') as HTMLElement;

describe('Skeleton', () => {
  it('is hidden from assistive tech, and still on the page', () => {
    const { container } = render(<Skeleton />);

    // Nothing to announce: a placeholder is not the thing it stands in for.
    // Testing Library's `byRole` walks the tree the way a screen reader does
    // (hidden elements excluded by default), so a bare `<div>`'s implicit
    // `generic` must not come back at all.
    expect(within(container).queryAllByRole('generic')).toHaveLength(0);
    expect(box(container)).toHaveAttribute('aria-hidden', 'true');
    // Hidden from AT, not from sight — the same guard `Separator` keeps
    // against a stray `[aria-hidden] { display: none }` in a consumer sheet.
    expect(box(container).getBoundingClientRect().height).toBeGreaterThan(0);
  });

  it('owns aria-hidden — a prop cannot smuggle it away', () => {
    // Written after the spread on purpose: this is the contract with
    // assistive tech, and a caller who wants a wait ANNOUNCED wants
    // `Progress`. A second channel would only let the two disagree.
    const { container } = render(<Skeleton aria-hidden={false} />);
    expect(box(container)).toHaveAttribute('aria-hidden', 'true');
  });

  it('takes its height from the type it stands in for', () => {
    // The whole of `shape="text"`: `1em` is the FONT's size, so a placeholder
    // inside heading-sized type comes out heading-sized with nothing passed.
    // A real layout measurement in Chromium, not a computed-style read.
    const { container } = render(
      <div style={{ fontSize: '32px' }}>
        <Skeleton shape="text" />
      </div>,
    );
    expect(box(container).getBoundingClientRect().height).toBe(32);
  });

  it('is never invisible when only the width is given', () => {
    // An empty block is 0px tall. A consumer who sizes one axis and not the
    // other would see nothing at all and read it as a broken component, so
    // `min-block-size` keeps a floor under every shape.
    const { container } = render(
      <Skeleton shape="block" style={{ inlineSize: '200px' }} />,
    );
    const rect = box(container).getBoundingClientRect();
    expect(rect.width).toBe(200);
    expect(rect.height).toBeGreaterThan(0);
  });

  it('stays round when only the width changes', () => {
    // `aspect-ratio`, not a fixed size: the failure a hard-coded `size` would
    // produce the first time somebody needed a small avatar.
    const { container } = render(
      <Skeleton shape="circle" style={{ inlineSize: '80px' }} />,
    );
    const rect = box(container).getBoundingClientRect();
    expect(rect.width).toBe(80);
    expect(rect.height).toBe(80);
  });

  it('is avatar-sized by default, not container-wide', () => {
    // THE ONE RULE HELD UP BY CASCADE ORDER, so it gets a measurement rather
    // than trust. The base spans the inline axis (`inline-size: 100%`) and
    // `circle` pins a width (`w-10`, Avatar's `md`); they are the same
    // property under two names at the same specificity, so only source order
    // decides — and the minifier is free to reorder rules. Inside a wide
    // container a regression here is a 300px circle, which no other test in
    // this file would see: the one above passes its own width, and axe does
    // not measure.
    const { container } = render(
      <div style={{ inlineSize: '300px' }}>
        <Skeleton shape="circle" />
      </div>,
    );
    const rect = box(container).getBoundingClientRect();
    expect(rect.width).toBe(40);
    expect(rect.height).toBe(40);
  });

  it('spans its container by default, and yields to an explicit width', () => {
    const { container } = render(
      <div style={{ inlineSize: '300px' }}>
        <Skeleton />
      </div>,
    );
    expect(box(container).getBoundingClientRect().width).toBe(300);
  });

  it('forwards ref to the underlying element (React 19 ref-as-prop)', () => {
    // Measurement is the reason this one matters: a placeholder is often
    // sized from the box it replaces.
    let el: HTMLElement | null = null;
    render(
      <Skeleton
        ref={(node) => {
          el = node;
        }}
      />,
    );
    expect(el).toBeInstanceOf(HTMLElement);
  });

  it('matches the rendered snapshot', () => {
    const { container } = render(<Skeleton shape="block" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  // axe in real Chromium — every shape, in each theme.
  describe('accessibility (axe)', () => {
    const shapes = ['text', 'block', 'circle'] as const;
    const themes = [
      { name: 'light', theme: undefined },
      { name: 'dark', theme: 'dark' },
    ] as const;

    for (const { name, theme } of themes) {
      for (const shape of shapes) {
        it(`has no violations — ${shape} / ${name}`, async () => {
          const { container } = renderUi(
            <div
              style={{
                background: 'var(--fm-color-background)',
                color: 'var(--fm-color-foreground)',
                padding: '1rem',
              }}
            >
              <Skeleton shape={shape} />
            </div>,
            { theme },
          );
          await expectNoA11yViolations(container);
        });
      }
    }

    it('has no violations inside the busy region that owns the state', async () => {
      // The documented pattern: the placeholders say nothing, the region says
      // it is working. The claim in the docs has its story AND its test.
      const { container } = renderUi(
        <div
          style={{
            background: 'var(--fm-color-background)',
            color: 'var(--fm-color-foreground)',
            padding: '1rem',
          }}
        >
          <section aria-busy="true" aria-label="Recent activity">
            <Skeleton shape="circle" />
            <Skeleton />
            <Skeleton />
          </section>
        </div>,
      );
      await expectNoA11yViolations(container);
    });
  });
});

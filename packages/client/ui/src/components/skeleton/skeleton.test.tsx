import { describe, it, expect, vi } from 'vitest';
import { render, within, waitFor, screen } from '@testing-library/react';
import { Skeleton } from './skeleton.component.js';
import { Avatar } from '../avatar/avatar.component.js';
import { VisuallyHidden } from '../visually-hidden/visually-hidden.component.js';
import type { SkeletonProps } from './skeleton.types.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

/**
 * The one element it renders. Found by the attribute that defines it rather
 * than by role, because having no role is the point — there is nothing else
 * in the tree carrying `aria-hidden`.
 */
const box = (container: HTMLElement) =>
  container.querySelector('[aria-hidden="true"]') as HTMLElement;

const rect = (container: HTMLElement) => box(container).getBoundingClientRect();

/** The stylesheet as authored — for the one promise no browser API can report. */
const source = Object.values(
  import.meta.glob('./skeleton.module.css', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>,
)[0] as string;

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
    expect(rect(container).height).toBeGreaterThan(0);
  });

  it('owns aria-hidden — a prop cannot smuggle it away', () => {
    // Written after the spread on purpose: this is the contract with
    // assistive tech, and a caller who wants a wait ANNOUNCED wants a live
    // region outside the placeholders. A second channel would only let the
    // two disagree.
    const { container } = render(<Skeleton aria-hidden={false} />);
    expect(box(container)).toHaveAttribute('aria-hidden', 'true');
  });

  describe('the hidden box has no inside, and no way in', () => {
    // THE TYPE IS NOT THE ENFORCEMENT, which is the whole reason these exist.
    // `children` and `dangerouslySetInnerHTML` are `Omit`ed from the props
    // type, and a consumer's one-line pass-through wrapper defeats that
    // without a single TypeScript complaint. Measured before the fix: both
    // rendered INSIDE the permanently `aria-hidden` box.
    const smuggle = (props: Record<string, unknown>) =>
      render(<Skeleton {...(props as SkeletonProps)} />);

    it('drops children forced through a spread', () => {
      const { container } = smuggle({ children: 'SMUGGLED' });
      expect(box(container).textContent).toBe('');
      expect(screen.queryByText('SMUGGLED')).toBeNull();
    });

    it('drops dangerouslySetInnerHTML forced through a spread', () => {
      const { container } = smuggle({
        dangerouslySetInnerHTML: { __html: '<b>INJECTED</b>' },
      });
      expect(box(container).innerHTML).toBe('');
    });

    it('refuses to become focusable', () => {
      // Focus landing on an `aria-hidden` element is a WCAG 4.1.2 defect and
      // axe's own `aria-hidden-focus` rule — in the CONSUMER's suite, not
      // ours, which is why the component has to refuse it rather than warn
      // alone.
      const { container } = smuggle({ tabIndex: 0 });
      expect(box(container)).not.toHaveAttribute('tabindex');
    });

    it('warns when ARIA is passed that it is about to annul', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      smuggle({ role: 'status', 'aria-live': 'polite' });

      // Silently dead, otherwise: markup that says it is a live region and can
      // never fire, with nothing — not TypeScript, not axe — to say so.
      await waitFor(() => {
        expect(warn).toHaveBeenCalledWith(
          expect.stringContaining('role, aria-live'),
        );
      });
      warn.mockRestore();
    });
  });

  describe('geometry — measured, because every one of these was wrong once', () => {
    it('occupies the LINE BOX of the text it replaces, not the font size', () => {
      // The component's entire promise. `1em` (the first version) is only the
      // type's size: measured against real copy it came out 2/3 of the line
      // and caused the layout jump the component exists to prevent.
      const { container } = render(
        <div style={{ inlineSize: '400px', fontSize: '16px', lineHeight: 1.5 }}>
          <p style={{ margin: 0 }}>One line of real copy</p>
          <Skeleton />
        </div>,
      );
      const line = container.querySelector('p') as HTMLElement;
      expect(line.getBoundingClientRect().height).toBe(24);
      expect(rect(container).height).toBe(24);
    });

    it('tracks the type it stands in for', () => {
      // `1lh` is relative, so a placeholder inside heading-sized type comes out
      // heading-sized with nothing passed.
      const { container } = render(
        <div style={{ fontSize: '32px', lineHeight: 1.5 }}>
          <Skeleton shape="text" />
        </div>,
      );
      expect(rect(container).height).toBe(48);
    });

    it('gives block a visible default height that an explicit one overrides', () => {
      const { container } = render(
        <Skeleton shape="block" style={{ inlineSize: '200px' }} />,
      );
      expect(rect(container).width).toBe(200);
      expect(rect(container).height).toBeGreaterThan(0);
    });

    it('lets block be thinner than a line of type', () => {
      // THE REGRESSION GUARD for the floor that used to live on the base rule.
      // `min-block-size: 1em` cannot be overridden by the property it
      // constrains, so a consumer asking for 8px — the height of this
      // library's own `Progress` — silently got 16px.
      const { container } = render(
        <Skeleton shape="block" style={{ blockSize: '8px' }} />,
      );
      expect(rect(container).height).toBe(8);
    });

    it('stays round when only the width changes', () => {
      const { container } = render(
        <Skeleton shape="circle" style={{ inlineSize: '80px' }} />,
      );
      expect(rect(container).width).toBe(80);
      expect(rect(container).height).toBe(80);
    });

    it('stays round BELOW one em, where the old floor made it an ellipse', () => {
      // 12px is a presence dot. With the floor on the base rule this measured
      // 12 × 16 in all three engines.
      const { container } = render(
        <Skeleton shape="circle" style={{ inlineSize: '12px' }} />,
      );
      expect(rect(container).width).toBe(12);
      expect(rect(container).height).toBe(12);
    });

    it('stays round in a flex row — it declines to stretch', () => {
      // The component's OWN documented layout: an avatar beside lines of text.
      // A flex item with an auto cross size takes a definite one from the line
      // under the default `stretch`, and a definite size beats `aspect-ratio` —
      // measured at 40 × 120 here before `align-self`.
      const { container } = render(
        <div style={{ display: 'flex', blockSize: '120px' }}>
          <Skeleton shape="circle" />
        </div>,
      );
      expect(rect(container).width).toBe(40);
      expect(rect(container).height).toBe(40);
    });

    it('is avatar-sized by default, not container-wide', () => {
      // THE RULE HELD UP BY CASCADE ORDER, so it gets a measurement rather
      // than trust. The base spans the inline axis and `circle` pins a width;
      // they are the same property at the same specificity, so only source
      // order decides — and the minifier is free to reorder rules.
      const { container } = render(
        <div style={{ inlineSize: '300px' }}>
          <Skeleton shape="circle" />
        </div>,
      );
      expect(rect(container).width).toBe(40);
      expect(rect(container).height).toBe(40);
    });

    it('is exactly as big as the Avatar it stands in for', () => {
      // The coupling is otherwise only a comment. `circle`'s default is
      // `Avatar`'s `md`, and the whole point of a placeholder is that nothing
      // moves when the real thing arrives — so a change to either scale has to
      // fail here rather than ship as a 4px jump on load.
      const { container } = renderUi(
        <>
          <Avatar size="md" name="Ada Lovelace" />
          <Skeleton shape="circle" />
        </>,
      );
      const avatarBox = screen
        .getByRole('img', { name: 'Ada Lovelace' })
        .getBoundingClientRect();
      expect(avatarBox.width).toBeGreaterThan(0);
      expect(rect(container).width).toBe(avatarBox.width);
      expect(rect(container).height).toBe(avatarBox.height);
    });

    it('spans a flex line instead of collapsing to fit-content', () => {
      // `inline-size: 100%` earns its place HERE and only here: in normal flow
      // a block div already fills its parent, so the obvious test passes with
      // the declaration deleted. As a flex item it measures 0 without it —
      // the same failure `Separator` guards on the other axis.
      const { container } = render(
        <div style={{ display: 'flex', inlineSize: '300px' }}>
          <Skeleton />
        </div>,
      );
      expect(rect(container).width).toBe(300);
    });

    it('keeps a consumer padding inside the box it was given', () => {
      // dist ships no Preflight and this suite loads none either (ADR-0022),
      // so `box-sizing` is the UA's `content-box` unless the component says
      // otherwise — and without it padding grows the box instead of fitting.
      const { container } = render(
        <Skeleton
          shape="block"
          style={{ inlineSize: '200px', padding: '10px' }}
        />,
      );
      expect(rect(container).width).toBe(200);
    });
  });

  describe('the shapes are actually different, and the default is one of them', () => {
    // Nothing else pins the cva mapping: `text` and `block` are dimensionally
    // identical for an empty box, so only the radius can tell them apart —
    // which also makes it the only thing that catches the two class names
    // being swapped.
    const radiusOf = (container: HTMLElement) =>
      getComputedStyle(box(container)).borderTopLeftRadius;

    it('paints a line of type with the small radius', () => {
      expect(radiusOf(render(<Skeleton shape="text" />).container)).toBe('4px');
    });

    it('paints a panel with the larger one', () => {
      expect(radiusOf(render(<Skeleton shape="block" />).container)).toBe(
        '6px',
      );
    });

    it('defaults to text', () => {
      // `<Skeleton />` is documented as a line of type; without this the
      // default could flip to `block` with every test still green.
      expect(radiusOf(render(<Skeleton />).container)).toBe('4px');
    });
  });

  describe('the pulse', () => {
    it('runs', () => {
      // Delete the `animation` declaration and, before this, every assertion
      // in the file still passed — including an invisible 0.05 keyframe, since
      // axe deliberately skips infinite animations.
      const { container } = render(<Skeleton />);
      expect(getComputedStyle(box(container)).animationName).not.toBe('none');
    });

    it('stops under reduced motion', () => {
      // A SOURCE assertion, and deliberately so: browser mode exposes no
      // `emulateMedia`, so the alternative is not a better test but no test.
      // The promise is in the docs, which makes silence the worse option.
      expect(source).toMatch(
        /@media \(prefers-reduced-motion: reduce\)[\s\S]*animation: none/,
      );
    });
  });

  it('keeps a consumer class alongside its own', () => {
    const { container } = render(<Skeleton className="mine" />);
    expect(box(container).classList.contains('mine')).toBe(true);
    expect(box(container).classList.length).toBeGreaterThan(1);
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

    it('leaves the busy region named, and the announcement audible', async () => {
      // THE DOCUMENTED PATTERN, asserted rather than assumed: axe alone cannot
      // see the failure that matters here, because a page of skeletons that
      // announces nothing is perfectly valid HTML. So this checks the two
      // things that make it work — the region is busy and still carries its
      // own name (the placeholders contribute nothing to it), and the live
      // region beside them has the text a screen reader will actually read.
      const { container } = renderUi(
        <div
          style={{
            background: 'var(--fm-color-background)',
            color: 'var(--fm-color-foreground)',
            padding: '1rem',
          }}
        >
          <section aria-busy="true" aria-label="Recent activity">
            <VisuallyHidden role="status">
              Loading recent activity
            </VisuallyHidden>
            <Skeleton shape="circle" />
            <Skeleton />
            <Skeleton />
          </section>
        </div>,
      );

      expect(
        screen.getByRole('region', { busy: true, name: 'Recent activity' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent(
        'Loading recent activity',
      );
      await expectNoA11yViolations(container);
    });
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './badge.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

const VARIANTS = [
  'neutral',
  'primary',
  'accent',
  'destructive',
  'success',
  'warning',
  'info',
] as const;

describe('Badge', () => {
  afterEach(() => vi.restoreAllMocks());

  it('renders a presentational span whose text is its accessible name', () => {
    render(<Badge>Beta</Badge>);
    const badge = screen.getByText('Beta');
    expect(badge.tagName).toBe('SPAN');
    // Presentational: no ARIA role imposed — the label carries the meaning.
    expect(badge).not.toHaveAttribute('role');
  });

  it('forwards arbitrary props (e.g. aria-label for a count) to the span', () => {
    render(<Badge aria-label="3 unread">3</Badge>);
    expect(screen.getByLabelText('3 unread')).toHaveTextContent('3');
  });

  it('forwards ref to the underlying span (React 19 ref-as-prop)', () => {
    const ref = { current: null as HTMLSpanElement | null };
    render(<Badge ref={ref}>Beta</Badge>);
    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
  });

  it('matches the rendered snapshot', () => {
    const { container } = render(<Badge variant="success">Active</Badge>);
    expect(container.firstChild).toMatchSnapshot();
  });

  describe('emphasis (real computed colours in Chromium)', () => {
    it('soft and solid paint different backgrounds', () => {
      const soft = render(
        <Badge variant="primary" emphasis="soft">
          A
        </Badge>,
      ).getByText('A');
      const solid = render(
        <Badge variant="primary" emphasis="solid">
          B
        </Badge>,
      ).getByText('B');
      const bg = (el: HTMLElement) => getComputedStyle(el).backgroundColor;
      // The subtle wash and the full fill are visibly distinct treatments.
      expect(bg(soft)).not.toBe(bg(solid));
      expect(bg(soft)).not.toBe('rgba(0, 0, 0, 0)'); // not transparent
    });
  });

  describe('size', () => {
    it('lg has a larger type size than sm', () => {
      const sm = render(<Badge size="sm">S</Badge>).getByText('S');
      const lg = render(<Badge size="lg">L</Badge>).getByText('L');
      const px = (el: HTMLElement) => parseFloat(getComputedStyle(el).fontSize);
      expect(px(lg)).toBeGreaterThan(px(sm));
    });

    it('md is padded wider than sm (the axis is padding-driven, not just type)', () => {
      // sm and md share `text-xs`, so the size difference is carried by padding.
      const sm = render(<Badge size="sm">S</Badge>).getByText('S');
      const md = render(<Badge size="md">M</Badge>).getByText('M');
      const pad = (el: HTMLElement) =>
        parseFloat(getComputedStyle(el).paddingInlineStart);
      expect(pad(md)).toBeGreaterThan(pad(sm));
    });
  });

  describe('icon', () => {
    it('renders a decorative leading icon (aria-hidden slot)', () => {
      render(
        <Badge icon={<svg data-testid="dot" viewBox="0 0 16 16" />}>
          Live
        </Badge>,
      );
      const slot = screen.getByTestId('dot').parentElement;
      expect(slot).toHaveAttribute('aria-hidden', 'true');
      // The icon does not pollute the accessible name — the text still names it.
      expect(screen.getByText('Live')).toBeInTheDocument();
    });

    it('warns in dev on an icon with no discernible text', () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      render(<Badge icon={<svg viewBox="0 0 16 16" />} />);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('icon-only badge'),
      );
    });

    it('warns on the shapes the hand-written check let through', () => {
      // `{items}` from a filter that matched nothing, whitespace, and `true` —
      // each renders NOTHING and each passed the old `!= null && !== false &&
      // !== ''` check, so the badge this guard exists for shipped unnamed
      // through exactly the inputs a real call site produces.
      for (const empty of [[], '   ', true] as const) {
        const warn = vi
          .spyOn(console, 'warn')
          .mockImplementation(() => undefined);
        render(<Badge icon={<svg />}>{empty}</Badge>);
        expect(warn, JSON.stringify(empty)).toHaveBeenCalledWith(
          expect.stringContaining('no discernible text'),
        );
        warn.mockRestore();
      }
    });

    it('counts a zero as a label, because a zero is a real count', () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      render(<Badge icon={<svg />}>{0}</Badge>);
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });

    it('does not warn when the icon is paired with text', () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      render(<Badge icon={<svg viewBox="0 0 16 16" />}>Live</Badge>);
      expect(warn).not.toHaveBeenCalled();
    });

    it('does not warn when an icon-only badge carries an aria-label', () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      render(<Badge icon={<svg viewBox="0 0 16 16" />} aria-label="Online" />);
      expect(warn).not.toHaveBeenCalled();
    });

    it('warns when the only child is falsy and renders nothing', () => {
      // The classic footgun: `{cond && 'label'}` collapses to `false`, leaving
      // an icon-only badge with no accessible name. `!= null` would miss it.
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      const cond = false;
      render(
        <Badge icon={<svg viewBox="0 0 16 16" />}>{cond && 'Label'}</Badge>,
      );
      render(<Badge icon={<svg viewBox="0 0 16 16" />}>{''}</Badge>);
      expect(warn).toHaveBeenCalledTimes(2);
    });

    it('does not warn on a 0 count — zero is a real label', () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      render(<Badge icon={<svg viewBox="0 0 16 16" />}>{0}</Badge>);
      expect(warn).not.toHaveBeenCalled();
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  it('renders inside an RTL provider (smoke)', () => {
    renderUi(<Badge variant="info">جديد</Badge>, { locale: 'ar' });
    const badge = screen.getByText('جديد');
    expect(badge.closest('[dir]')).toHaveAttribute('dir', 'rtl');
  });

  // axe in real Chromium — every variant × emphasis meets contrast, both themes.
  describe('accessibility (axe)', () => {
    const themes = [
      { name: 'light', theme: undefined },
      { name: 'dark', theme: 'dark' },
    ] as const;

    for (const { name, theme } of themes) {
      for (const emphasis of ['soft', 'solid'] as const) {
        it(`no violations — all variants / ${emphasis} / ${name}`, async () => {
          const { container } = renderUi(
            <div
              style={{
                background: 'var(--fm-color-background)',
                color: 'var(--fm-color-foreground)',
                padding: '1rem',
              }}
            >
              {VARIANTS.map((v) => (
                <Badge key={v} variant={v} emphasis={emphasis}>
                  {v}
                </Badge>
              ))}
            </div>,
            { theme },
          );
          await expectNoA11yViolations(container);
        });
      }
    }
  });
});

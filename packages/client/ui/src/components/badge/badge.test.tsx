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
      ).getByText('A' as string);
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

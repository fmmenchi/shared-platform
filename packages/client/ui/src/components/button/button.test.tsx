import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './button.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

describe('Button', () => {
  it('has button semantics and its accessible name', () => {
    render(<Button>Save</Button>);
    // Semantic query — by role and name, not by test-id.
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('renders a native <button> of type button by default', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('calls onClick when activated', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('reflects the disabled state (native semantics)', () => {
    render(<Button disabled>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('renders as another element via `as` (polymorphism)', () => {
    render(
      <Button as="a" href="/next">
        Go
      </Button>,
    );
    const link = screen.getByRole('link', { name: 'Go' });
    expect(link).toHaveAttribute('href', '/next');
    expect(link).not.toHaveAttribute('type'); // no button-only attrs leak
  });

  it('matches the rendered snapshot', () => {
    const { container } = render(<Button variant="primary">Save</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });

  describe('loading state', () => {
    it('is pending, not disabled: busy, aria-disabled, and still focusable', () => {
      render(<Button isLoading>Save</Button>);
      // EXACT name: the loading status must not pollute the accessible name
      // (a status span inside the button would make it "Save Loading").
      const btn = screen.getByRole('button', { name: 'Save' });
      expect(btn).toHaveAttribute('aria-busy', 'true');
      expect(btn).toHaveAttribute('aria-disabled', 'true');
      // Never native `disabled` while loading — that would drop focus to the
      // page mid-interaction (WCAG 2.4.3) and read as a dead control.
      expect(btn).not.toBeDisabled();
      btn.focus();
      expect(btn).toHaveFocus();
    });

    it('blocks activation on the native button (mouse and keyboard)', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(
        <Button isLoading onClick={onClick}>
          Save
        </Button>,
      );
      const btn = screen.getByRole('button', { name: /save/i });
      // pointer-events is none; keyboard is the path that must be guarded
      // (Enter/Space on a focusable pending button still fires click).
      btn.focus();
      await user.keyboard('{Enter}');
      await user.keyboard(' ');
      expect(onClick).not.toHaveBeenCalled();
    });

    it('announces via a PERSISTENT status region outside the button', () => {
      // The region must pre-exist (mounting one already populated is routinely
      // missed by screen readers) and live OUTSIDE the button (inside, its text
      // would join the accessible name).
      const { rerender } = render(<Button>Save</Button>);
      const region = screen.getByRole('status');
      expect(region).toHaveTextContent('');
      expect(screen.getByRole('button', { name: 'Save' })).not.toContainElement(
        region,
      );

      rerender(<Button isLoading>Save</Button>);
      expect(screen.getByRole('status')).toHaveTextContent('Loading');
      // The name stays clean while the region is populated.
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();

      rerender(<Button>Save</Button>);
      expect(screen.getByRole('status')).toHaveTextContent('');
    });

    it('a deliberately disabled button stays natively disabled while loading', () => {
      render(
        <Button disabled isLoading>
          Save
        </Button>,
      );
      expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
    });

    it('blocks activation on a non-native polymorph (as="a")', () => {
      // A link can't be `disabled`: loading must still block it — via
      // aria-disabled + a click guard (keyboard Enter fires click too).
      const onClick = vi.fn();
      render(
        <Button as="a" href="/next" isLoading onClick={onClick}>
          Go
        </Button>,
      );
      const link = screen.getByRole('link', { name: /go/i });
      expect(link).toHaveAttribute('aria-disabled', 'true');
      expect(link).toHaveAttribute('aria-busy', 'true');
      // pointer-events is none, so dispatch directly: the guard must both
      // swallow the handler and prevent the default (href navigation).
      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });
      link.dispatchEvent(event);
      expect(onClick).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(true);
    });

    it('a non-loading polymorph still fires onClick', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn((e: { preventDefault(): void }) =>
        e.preventDefault(),
      );
      render(
        <Button as="a" href="/next" onClick={onClick}>
          Go
        </Button>,
      );
      await user.click(screen.getByRole('link', { name: 'Go' }));
      expect(onClick).toHaveBeenCalledOnce();
    });

    it('keeps the visible label unchanged (status is sr-only)', () => {
      // The localized status must never alter the visible wording or size.
      renderUi(<Button isLoading>Salva</Button>, { locale: 'it' });
      const status = screen.getByText('Caricamento');
      expect(status.className).toMatch(/srOnly/);
      expect(screen.getByRole('button', { name: /Salva/ })).toBeInTheDocument();
    });
  });

  describe('self-managed pending (async onClick)', () => {
    it('closes the double-click race and holds pending until settle', async () => {
      let resolve!: () => void;
      const onClick = vi.fn(
        () =>
          new Promise<void>((r) => {
            resolve = r;
          }),
      );
      render(<Button onClick={onClick}>Pay</Button>);
      const btn = screen.getByRole('button', { name: 'Pay' });
      // Two physical clicks can land BEFORE React re-renders — the classic
      // double-submit window. The synchronous ref gate must swallow the 2nd.
      btn.click();
      btn.click();
      expect(onClick).toHaveBeenCalledOnce();
      await waitFor(() => expect(btn).toHaveAttribute('aria-busy', 'true'));
      expect(btn).toHaveAttribute('aria-disabled', 'true');
      expect(screen.getByRole('status')).toHaveTextContent('Loading');

      resolve();
      await waitFor(() => expect(btn).not.toHaveAttribute('aria-busy'));
      btn.click(); // usable again once settled
      expect(onClick).toHaveBeenCalledTimes(2);
    });

    it('a sync onClick is untouched — no pending state', () => {
      const onClick = vi.fn();
      render(<Button onClick={onClick}>Save</Button>);
      const btn = screen.getByRole('button', { name: 'Save' });
      btn.click();
      btn.click();
      expect(onClick).toHaveBeenCalledTimes(2);
      expect(btn).not.toHaveAttribute('aria-busy');
    });
  });

  describe('slots and polymorph plumbing', () => {
    it('forwards disabled to a custom component polymorph', () => {
      const Custom = (props: Record<string, unknown>) => (
        <button {...(props as object)} />
      );
      render(
        <Button as={Custom} disabled>
          Go
        </Button>,
      );
      expect(screen.getByRole('button', { name: 'Go' })).toBeDisabled();
    });

    it('renders a trailing iconEnd, decorative, and keeps it while loading', () => {
      const { rerender } = render(
        <Button iconEnd={<svg data-testid="chevron" viewBox="0 0 16 16" />}>
          Next
        </Button>,
      );
      const slot = screen.getByTestId('chevron').parentElement;
      expect(slot).toHaveAttribute('aria-hidden', 'true');
      rerender(
        <Button
          iconEnd={<svg data-testid="chevron" viewBox="0 0 16 16" />}
          isLoading
        >
          Next
        </Button>,
      );
      // The trailing icon stays put — the leading spinner carries the state.
      expect(screen.getByTestId('chevron')).toBeInTheDocument();
    });

    it('forwards ref to the underlying element (React 19 ref-as-prop)', () => {
      const buttonRef = { current: null as HTMLButtonElement | null };
      render(<Button ref={buttonRef}>Save</Button>);
      expect(buttonRef.current).toBeInstanceOf(HTMLButtonElement);

      const anchorRef = { current: null as HTMLAnchorElement | null };
      render(
        <Button as="a" href="/next" ref={anchorRef}>
          Go
        </Button>,
      );
      expect(anchorRef.current).toBeInstanceOf(HTMLAnchorElement);
    });

    it('renders inside an RTL provider (smoke)', () => {
      renderUi(<Button icon={<svg viewBox="0 0 16 16" />}>حفظ</Button>, {
        locale: 'ar',
      });
      const btn = screen.getByRole('button', { name: 'حفظ' });
      expect(btn.closest('[dir]')).toHaveAttribute('dir', 'rtl');
    });
  });

  // Real Chromium: computed styles are the actual layout, so geometry is
  // asserted deterministically — the DS promise is exact control heights.
  describe('sizing', () => {
    const heights = { sm: 32, md: 36, lg: 44 } as const;
    for (const [size, px] of Object.entries(heights)) {
      it(`${size} is exactly ${px}px tall`, () => {
        render(<Button size={size as keyof typeof heights}>Save</Button>);
        const btn = screen.getByRole('button', { name: 'Save' });
        expect(btn.getBoundingClientRect().height).toBe(px);
      });
    }

    it('an icon-only button is square', () => {
      render(<Button aria-label="Add" icon={<svg viewBox="0 0 16 16" />} />);
      const rect = screen
        .getByRole('button', { name: 'Add' })
        .getBoundingClientRect();
      expect(rect.width).toBe(rect.height);
    });

    it('an icon-bearing button keeps its width when loading starts', () => {
      const { rerender } = render(
        <Button icon={<svg viewBox="0 0 16 16" />}>Save</Button>,
      );
      const before = screen
        .getByRole('button', { name: 'Save' })
        .getBoundingClientRect().width;
      rerender(
        <Button icon={<svg viewBox="0 0 16 16" />} isLoading>
          Save
        </Button>,
      );
      const after = screen
        .getByRole('button', { name: /save/i })
        .getBoundingClientRect().width;
      expect(after).toBe(before);
    });
  });

  // axe runs in real Chromium, so color-contrast is checked against the actual
  // token values — each colour role is a distinct contrast pair, in each theme.
  describe('accessibility (axe)', () => {
    const variants = [
      'primary',
      'secondary',
      'accent',
      'ghost',
      'destructive',
    ] as const;
    const themes = [
      { name: 'light', theme: undefined },
      { name: 'dark', theme: 'dark' },
    ] as const;

    for (const { name, theme } of themes) {
      for (const variant of variants) {
        it(`has no violations — ${variant} / ${name}`, async () => {
          // Paint the surface with the theme's bg/fg so axe resolves contrast
          // for transparent variants (e.g. ghost) against the real background.
          const { container } = renderUi(
            <div
              style={{
                backgroundColor: 'var(--fm-color-background)',
                color: 'var(--fm-color-foreground)',
              }}
            >
              <Button variant={variant}>Save</Button>
            </div>,
            { theme },
          );
          await expectNoA11yViolations(container);
        });
      }
    }

    it('has no violations while loading', async () => {
      const { container } = renderUi(<Button isLoading>Save</Button>);
      await expectNoA11yViolations(container);
    });
  });
});

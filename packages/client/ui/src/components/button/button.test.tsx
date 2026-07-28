import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
      const btn = screen.getByRole('button', { name: /save/i });
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

    it('announces the transition via a status region', () => {
      renderUi(<Button isLoading>Save</Button>, { locale: 'en' });
      expect(screen.getByRole('status')).toHaveTextContent('Loading');
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

  // axe runs in real Chromium, so color-contrast is checked against the actual
  // token values — each colour role is a distinct contrast pair, in each theme.
  describe('accessibility (axe)', () => {
    const variants = ['primary', 'secondary', 'ghost', 'destructive'] as const;
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

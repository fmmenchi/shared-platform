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

  it('has no accessibility violations', async () => {
    const { container } = render(<Button>Save</Button>);
    await expectNoA11yViolations(container);
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

  it('composes with asChild (polymorphism)', () => {
    render(
      <Button asChild>
        <a href="/next">Go</a>
      </Button>,
    );
    expect(screen.getByRole('link', { name: 'Go' })).toHaveAttribute(
      'href',
      '/next',
    );
  });

  it('matches the rendered snapshot', () => {
    const { container } = render(<Button variant="primary">Save</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });

  describe('loading state', () => {
    it('is busy and disabled while loading', () => {
      render(<Button isLoading>Save</Button>);
      const btn = screen.getByRole('button', { name: /save/i });
      expect(btn).toHaveAttribute('aria-busy', 'true');
      expect(btn).toBeDisabled();
    });

    it('announces a localized status (fallback locale, no provider)', () => {
      render(<Button isLoading>Save</Button>);
      // Base-locale fallback when rendered outside a UiProvider.
      expect(screen.getByText('Loading')).toBeInTheDocument();
    });

    it('resolves the status from the active locale (it)', () => {
      renderUi(<Button isLoading>Salva</Button>, { locale: 'it' });
      expect(screen.getByText('Caricamento')).toBeInTheDocument();
    });

    it('surfaces the localized label as content when there is none', () => {
      renderUi(<Button isLoading />, { locale: 'it' });
      expect(
        screen.getByRole('button', { name: 'Caricamento' }),
      ).toBeInTheDocument();
    });

    it('has no accessibility violations while loading', async () => {
      const { container } = renderUi(<Button isLoading>Save</Button>);
      await expectNoA11yViolations(container);
    });
  });

  describe('direction (derived from locale)', () => {
    it('renders LTR for a Latin locale', () => {
      const { container } = renderUi(<Button>Save</Button>, { locale: 'en' });
      expect(container.querySelector('[dir]')).toHaveAttribute('dir', 'ltr');
    });

    it('renders RTL for Arabic', () => {
      const { container } = renderUi(<Button>حفظ</Button>, { locale: 'ar' });
      expect(container.querySelector('[dir]')).toHaveAttribute('dir', 'rtl');
    });

    it('is script-aware: az-Arab is RTL, az is LTR', () => {
      // The direction comes from the resolved script, not the language — a
      // language-only check would get az-Arab wrong.
      const rtl = renderUi(<Button>t</Button>, { locale: 'az-Arab' });
      expect(rtl.container.querySelector('[dir]')).toHaveAttribute(
        'dir',
        'rtl',
      );
      const ltr = renderUi(<Button>t</Button>, { locale: 'az' });
      expect(ltr.container.querySelector('[dir]')).toHaveAttribute(
        'dir',
        'ltr',
      );
    });
  });
});

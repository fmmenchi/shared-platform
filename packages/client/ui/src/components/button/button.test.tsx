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

    it('uses the localized status as content when there is no label', () => {
      // Button-specific rendering: with no children it surfaces the loading
      // copy as the button's content. (Message resolution itself is covered in
      // provider.test.tsx.)
      renderUi(<Button isLoading />, { locale: 'it' });
      expect(
        screen.getByRole('button', { name: 'Caricamento' }),
      ).toBeInTheDocument();
    });
  });

  // axe runs in real Chromium, so color-contrast is checked against the actual
  // token values — and each colour role is a distinct contrast pair.
  describe('accessibility (axe)', () => {
    const variants = ['primary', 'secondary', 'ghost', 'destructive'] as const;
    for (const variant of variants) {
      it(`has no violations — ${variant}`, async () => {
        const { container } = render(<Button variant={variant}>Save</Button>);
        await expectNoA11yViolations(container);
      });
    }

    it('has no violations while loading', async () => {
      const { container } = renderUi(<Button isLoading>Save</Button>);
      await expectNoA11yViolations(container);
    });
  });
});

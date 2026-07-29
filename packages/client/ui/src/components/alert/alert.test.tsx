import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Alert } from './alert.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

const VARIANTS = ['info', 'success', 'warning', 'error'] as const;

describe('Alert', () => {
  it('renders its message content', () => {
    render(<Alert>Saved</Alert>);
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it('forwards ref to the underlying element (React 19 ref-as-prop)', () => {
    // A callback ref stays type-correct whatever element the component renders.
    let el: HTMLElement | null = null;
    render(
      <Alert
        ref={(node) => {
          el = node;
        }}
      >
        Saved
      </Alert>,
    );
    expect(el).toBeInstanceOf(HTMLElement);
  });

  it('matches the rendered snapshot', () => {
    const { container } = render(<Alert variant="error">Failed</Alert>);
    expect(container.firstChild).toMatchSnapshot();
  });

  describe('live region', () => {
    it('an error is assertive (role="alert") by default', () => {
      render(<Alert variant="error">Boom</Alert>);
      expect(screen.getByRole('alert')).toHaveTextContent('Boom');
    });

    it('other variants are polite (role="status") by default', () => {
      render(<Alert variant="success">Done</Alert>);
      expect(screen.getByRole('status')).toHaveTextContent('Done');
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('the `live` prop overrides the variant default', () => {
      const { rerender } = render(
        <Alert variant="info" live="assertive">
          Now
        </Alert>,
      );
      expect(screen.getByRole('alert')).toBeInTheDocument();

      rerender(
        <Alert variant="error" live="polite">
          Later
        </Alert>,
      );
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('live="off" leaves no live region (for static content)', () => {
      render(
        <Alert variant="error" live="off">
          Static
        </Alert>,
      );
      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.queryByRole('status')).toBeNull();
      expect(screen.getByText('Static')).toBeInTheDocument();
    });

    it('defaults to variant "info" (role="status") with no variant', () => {
      render(<Alert>Heads up</Alert>);
      expect(screen.getByRole('status')).toHaveTextContent('Heads up');
    });

    it('coalesces an explicit variant={null} to the default', () => {
      // VariantProps admits null; the component must not crash or drop the role.
      render(<Alert variant={null}>Anything</Alert>);
      expect(screen.getByRole('status')).toHaveTextContent('Information');
    });

    it('the derived role is authoritative over a role in spread props', () => {
      // `live` is the knob — a stray role must not silently kill the announcement.
      render(
        <Alert variant="error" role="region">
          Boom
        </Alert>,
      );
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.queryByRole('region')).toBeNull();
      // …but with live="off" the component sets no role, leaving the custom one.
      render(
        <Alert live="off" role="note">
          Static
        </Alert>,
      );
      expect(screen.getByRole('note')).toHaveTextContent('Static');
    });
  });

  describe('severity is conveyed to assistive tech (not colour alone)', () => {
    it('prepends a visually-hidden severity word', () => {
      render(<Alert variant="error">Payment failed</Alert>);
      const region = screen.getByRole('alert');
      // The status word is in the announced content, before the message…
      expect(region).toHaveTextContent('Error');
      // …but sr-only, so it never changes the visible wording.
      const severity = screen.getByText('Error:', { exact: false });
      expect(severity.className).toMatch(/srOnly/);
    });

    it('localizes the severity word', () => {
      // Distinct body so the assertion targets the severity, not the message.
      renderUi(<Alert variant="error">Pagamento rifiutato</Alert>, {
        locale: 'it',
      });
      const severity = screen.getByText('Errore:', { exact: false });
      expect(severity.className).toMatch(/srOnly/);
    });
  });

  describe('slots', () => {
    it('renders a decorative icon (aria-hidden) and a title', () => {
      render(
        <Alert
          variant="warning"
          title="Heads up"
          icon={<svg data-testid="tri" viewBox="0 0 16 16" />}
        >
          Low disk space
        </Alert>,
      );
      expect(screen.getByTestId('tri').parentElement).toHaveAttribute(
        'aria-hidden',
        'true',
      );
      expect(screen.getByText('Heads up')).toBeInTheDocument();
      expect(screen.getByText('Low disk space')).toBeInTheDocument();
    });
  });

  // axe in real Chromium — every variant meets contrast, both themes.
  describe('accessibility (axe)', () => {
    const themes = [
      { name: 'light', theme: undefined },
      { name: 'dark', theme: 'dark' },
    ] as const;

    for (const { name, theme } of themes) {
      it(`no violations — all variants / ${name}`, async () => {
        const { container } = renderUi(
          <div
            style={{
              background: 'var(--fm-color-background)',
              color: 'var(--fm-color-foreground)',
              padding: '1rem',
              display: 'grid',
              gap: '1rem',
            }}
          >
            {VARIANTS.map((v) => (
              <Alert key={v} variant={v} title={v}>
                {v} message
              </Alert>
            ))}
          </div>,
          { theme },
        );
        await expectNoA11yViolations(container);
      });
    }
  });
});

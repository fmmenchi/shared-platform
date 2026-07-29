import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './input.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

describe('Input', () => {
  it('is a textbox that takes its name from an associated label', () => {
    render(
      <label>
        Email
        <Input />
      </label>,
    );
    expect(screen.getByRole('textbox', { name: 'Email' })).toBeInTheDocument();
  });

  it('defaults to type="text"', () => {
    render(<Input aria-label="q" />);
    expect(screen.getByRole('textbox', { name: 'q' })).toHaveAttribute(
      'type',
      'text',
    );
  });

  it('forwards ref to the input element', () => {
    let el: HTMLElement | null = null;
    render(
      <Input
        aria-label="q"
        ref={(node) => {
          el = node;
        }}
      />,
    );
    expect(el).toBeInstanceOf(HTMLInputElement);
  });

  it('matches the rendered snapshot', () => {
    const { container } = render(<Input aria-label="q" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  describe('transparency (ADR-0013)', () => {
    it('spreads arbitrary native props through to the input', () => {
      render(
        <Input aria-label="q" name="email" placeholder="you@x.com" readOnly />,
      );
      const input = screen.getByRole('textbox', { name: 'q' });
      expect(input).toHaveAttribute('name', 'email');
      expect(input).toHaveAttribute('placeholder', 'you@x.com');
      expect(input).toHaveAttribute('readonly');
    });

    it('works uncontrolled — does not hijack the value', async () => {
      const user = userEvent.setup();
      render(<Input aria-label="q" defaultValue="a" />);
      const input = screen.getByRole<HTMLInputElement>('textbox', {
        name: 'q',
      });
      await user.type(input, 'bc');
      expect(input.value).toBe('abc');
    });

    it('works controlled — forwards onChange for the library to own the value', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Input aria-label="q" value="" onChange={onChange} />);
      await user.type(screen.getByRole('textbox', { name: 'q' }), 'x');
      expect(onChange).toHaveBeenCalled();
    });
  });

  it('styles the native aria-invalid state (no `invalid` prop)', () => {
    const { rerender } = render(<Input aria-label="q" />);
    const input = screen.getByRole('textbox', { name: 'q' });
    const border = () => getComputedStyle(input).borderColor;
    const base = border();
    rerender(<Input aria-label="q" aria-invalid="true" />);
    expect(border()).not.toBe(base);
  });

  it('reflects the disabled state', () => {
    render(<Input aria-label="q" disabled />);
    expect(screen.getByRole('textbox', { name: 'q' })).toBeDisabled();
  });

  // Real Chromium: heights are exact and match Button, so a control and a button
  // align on the same row.
  describe('sizing', () => {
    const heights = { sm: 32, md: 36, lg: 44 } as const;
    for (const [size, px] of Object.entries(heights)) {
      it(`${size} is exactly ${px}px tall`, () => {
        render(<Input aria-label="q" size={size as keyof typeof heights} />);
        const input = screen.getByRole('textbox', { name: 'q' });
        expect(input.getBoundingClientRect().height).toBe(px);
      });
    }
  });

  describe('accessibility (axe)', () => {
    const themes = [
      { name: 'light', theme: undefined },
      { name: 'dark', theme: 'dark' },
    ] as const;

    for (const { name, theme } of themes) {
      it(`no violations — labelled / default / invalid / disabled / ${name}`, async () => {
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
            <label>
              Name
              <Input />
            </label>
            <label>
              Email
              <Input aria-invalid="true" />
            </label>
            <label>
              Locked
              <Input disabled />
            </label>
          </div>,
          { theme },
        );
        await expectNoA11yViolations(container);
      });
    }
  });
});

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

    it('works controlled — forwards onChange and never owns the value itself', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Input aria-label="q" value="" onChange={onChange} />);
      const input = screen.getByRole<HTMLInputElement>('textbox', {
        name: 'q',
      });
      await user.type(input, 'x');
      expect(onChange).toHaveBeenCalled();
      // Pinned value + a no-op onChange: a transparent control reverts to '',
      // proving the DS holds no internal state (a regression that managed its
      // own value would leave 'x' here). This is React's own controlled input,
      // which is what every major library uses for a text value — verified
      // against MUI InputBase, Mantine Input and Base UI FieldControl.
      expect(input.value).toBe('');
    });

    it('passes a custom type through to the DOM', () => {
      render(<Input aria-label="q" type="email" />);
      expect(screen.getByRole('textbox', { name: 'q' })).toHaveAttribute(
        'type',
        'email',
      );
    });
  });

  describe('naming (a label is the consumer’s job)', () => {
    it('has no accessible name on its own — a placeholder is not a label', () => {
      render(<Input placeholder="you@example.com" />);
      // The placeholder must NOT satisfy the accessible name.
      expect(
        screen.queryByRole('textbox', { name: 'you@example.com' }),
      ).toBeNull();
      expect(screen.getByRole('textbox')).toHaveAccessibleName('');
    });
  });

  it('renders inside an RTL provider (smoke)', () => {
    renderUi(
      <label>
        الاسم
        <Input />
      </label>,
      { locale: 'ar' },
    );
    const input = screen.getByRole('textbox', { name: 'الاسم' });
    expect(input.closest('[dir]')).toHaveAttribute('dir', 'rtl');
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

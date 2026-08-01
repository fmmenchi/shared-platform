import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Textarea } from './textarea.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

describe('Textarea', () => {
  it('is a textbox that takes its name from an associated label', () => {
    render(
      <label>
        Notes
        <Textarea />
      </label>,
    );
    expect(screen.getByRole('textbox', { name: 'Notes' })).toBeInTheDocument();
  });

  it('leaves `rows` to the browser and to the consumer', () => {
    // A default here would make the React Compiler bail on the component, and
    // a fixed height in css would make `rows` a lie.
    const { rerender } = render(<Textarea aria-label="q" />);
    expect(screen.getByRole('textbox', { name: 'q' })).not.toHaveAttribute(
      'rows',
    );
    rerender(<Textarea aria-label="q" rows={8} />);
    expect(screen.getByRole('textbox', { name: 'q' })).toHaveAttribute(
      'rows',
      '8',
    );
  });

  it('forwards ref to the textarea element', () => {
    let el: HTMLElement | null = null;
    render(
      <Textarea
        aria-label="q"
        ref={(node) => {
          el = node;
        }}
      />,
    );
    expect(el).toBeInstanceOf(HTMLTextAreaElement);
  });

  it('matches the rendered snapshot', () => {
    const { container } = render(<Textarea aria-label="q" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  describe('transparency (ADR-0013)', () => {
    it('spreads arbitrary native props through to the textarea', () => {
      render(
        <Textarea
          aria-label="q"
          name="notes"
          placeholder="Say more…"
          maxLength={280}
          readOnly
        />,
      );
      const field = screen.getByRole('textbox', { name: 'q' });
      expect(field).toHaveAttribute('name', 'notes');
      expect(field).toHaveAttribute('placeholder', 'Say more…');
      expect(field).toHaveAttribute('maxlength', '280');
      expect(field).toHaveAttribute('readonly');
    });

    it('works uncontrolled — does not hijack the value', async () => {
      const user = userEvent.setup();
      render(<Textarea aria-label="q" defaultValue="a" />);
      const field = screen.getByRole<HTMLTextAreaElement>('textbox', {
        name: 'q',
      });
      await user.type(field, 'bc');
      expect(field.value).toBe('abc');
    });

    it('works controlled — forwards onChange and never owns the value itself', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<Textarea aria-label="q" value="" onChange={onChange} />);
      const field = screen.getByRole<HTMLTextAreaElement>('textbox', {
        name: 'q',
      });

      await user.type(field, 'x');

      expect(onChange).toHaveBeenCalledTimes(1);
      // The value stayed where the consumer put it: the component never wrote
      // to it, which is what makes it drop into any form library.
      expect(field.value).toBe('');
    });

    it('presents the invalid state from the native attribute', () => {
      render(<Textarea aria-label="q" aria-invalid="true" />);
      expect(screen.getByRole('textbox', { name: 'q' })).toHaveAttribute(
        'aria-invalid',
        'true',
      );
    });
  });

  // axe in real Chromium — every size, in each theme.
  describe('accessibility (axe)', () => {
    const sizes = ['sm', 'md', 'lg'] as const;
    const themes = [
      { name: 'light', theme: undefined },
      { name: 'dark', theme: 'dark' },
    ] as const;

    for (const { name, theme } of themes) {
      for (const size of sizes) {
        it(`has no violations — ${size} / ${name}`, async () => {
          const { container } = renderUi(
            <div
              style={{
                background: 'var(--fm-color-background)',
                color: 'var(--fm-color-foreground)',
                padding: '1rem',
              }}
            >
              <label>
                Notes
                <Textarea size={size} />
              </label>
            </div>,
            { theme },
          );
          await expectNoA11yViolations(container);
        });
      }
    }
  });
});

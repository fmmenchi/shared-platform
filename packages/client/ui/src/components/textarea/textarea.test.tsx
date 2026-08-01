import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Textarea } from './textarea.component.js';
import { Field } from '../field/field.component.js';
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

  // Untested until an adversarial review removed `useFieldControl` and watched
  // all 14 tests stay green.
  it('inside a Field, adopts its id, description and invalid state', async () => {
    render(
      <Field label="Notes" hint="Markdown is fine." error="Too short.">
        <Textarea />
      </Field>,
    );

    const field = screen.getByRole('textbox', { name: 'Notes' });
    expect(field).toHaveAttribute('id');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() =>
      expect(field).toHaveAccessibleDescription('Markdown is fine. Too short.'),
    );
  });

  it('honours its size and resize axes, and merges the consumer className', () => {
    // `textareaVariants({})` used to leave the suite green: neither axis was
    // asserted anywhere.
    const { rerender } = render(
      <Textarea aria-label="q" size="lg" resize="none" className="mine" />,
    );
    const field = screen.getByRole('textbox', { name: 'q' });
    const large = field.className;
    expect(field).toHaveClass('mine');

    rerender(
      <Textarea aria-label="q" size="sm" resize="none" className="mine" />,
    );
    const small = screen.getByRole('textbox', { name: 'q' }).className;
    expect(small).not.toBe(large);

    rerender(
      <Textarea aria-label="q" size="sm" resize="vertical" className="mine" />,
    );
    expect(screen.getByRole('textbox', { name: 'q' }).className).not.toBe(
      small,
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

  // What this catches: a change in the MARKUP — a stray wrapper, a lost
  // attribute. What it does NOT catch: anything in the stylesheet. The class
  // names are content-hashed, so editing one declaration fails this test with
  // the same diff as editing another, and the reflex `-u` absorbs both.
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
              <label>
                Invalid
                <Textarea size={size} aria-invalid="true" />
              </label>
              <label>
                Disabled
                <Textarea size={size} disabled />
              </label>
              <label>
                Read-only
                <Textarea size={size} readOnly defaultValue="Said." />
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

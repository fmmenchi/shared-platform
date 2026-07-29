import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Field } from './field.component.js';
import { FieldLabel } from './field-label.component.js';
import { FieldDescription } from './field-description.component.js';
import { FieldError } from './field-error.component.js';
import { Input } from '../input/input.component.js';
import { renderUi } from '../../test/render.js';
import { expectNoA11yViolations } from '../../test/axe.js';

describe('Field', () => {
  afterEach(() => vi.restoreAllMocks());

  it('associates the label with the control (shared id, name from label)', () => {
    render(
      <Field>
        <FieldLabel>Email</FieldLabel>
        <Input />
      </Field>,
    );
    const input = screen.getByRole('textbox', { name: 'Email' });
    const label = screen.getByText('Email');
    expect(label).toHaveAttribute('for', input.id);
    expect(input.id).toBeTruthy();
  });

  it('focuses the control when the label is clicked', async () => {
    const user = userEvent.setup();
    render(
      <Field>
        <FieldLabel>Email</FieldLabel>
        <Input />
      </Field>,
    );
    await user.click(screen.getByText('Email'));
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveFocus();
  });

  it('describes the control with the description text', async () => {
    render(
      <Field>
        <FieldLabel>Email</FieldLabel>
        <Input />
        <FieldDescription>We’ll never share it.</FieldDescription>
      </Field>,
    );
    const input = screen.getByRole('textbox', { name: 'Email' });
    const desc = screen.getByText('We’ll never share it.');
    await waitFor(() =>
      expect(input.getAttribute('aria-describedby')).toContain(desc.id),
    );
  });

  it('marks invalid and describes + shows the error when invalid', async () => {
    render(
      <Field invalid>
        <FieldLabel>Email</FieldLabel>
        <Input />
        <FieldError>Enter a valid email.</FieldError>
      </Field>,
    );
    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const err = screen.getByText('Enter a valid email.');
    await waitFor(() =>
      expect(input.getAttribute('aria-describedby')).toContain(err.id),
    );
  });

  it('renders no error and adds nothing to aria-describedby when the error is empty', () => {
    render(
      <Field>
        <FieldLabel>Email</FieldLabel>
        <Input />
        <FieldError>{false}</FieldError>
      </Field>,
    );
    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(input).not.toHaveAttribute('aria-describedby');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('lets the control’s own props win over the field wiring', () => {
    render(
      <Field invalid>
        <FieldLabel>Email</FieldLabel>
        <Input id="custom" aria-invalid={false} />
      </Field>,
    );
    // Own id wins; own aria-invalid=false overrides the field's invalid.
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('id', 'custom');
    expect(input).toHaveAttribute('aria-invalid', 'false');
  });

  it('leaves a standalone control (no Field) untouched', () => {
    render(<Input aria-label="Solo" />);
    const input = screen.getByRole('textbox', { name: 'Solo' });
    expect(input).not.toHaveAttribute('aria-describedby');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('warns when FieldLabel is used outside a Field', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<FieldLabel>Orphan</FieldLabel>);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('outside a <Field>'),
    );
  });

  it('forwards ref to the container element', () => {
    let el: HTMLElement | null = null;
    render(
      <Field
        ref={(node) => {
          el = node;
        }}
      >
        <FieldLabel>Email</FieldLabel>
        <Input />
      </Field>,
    );
    expect(el).toBeInstanceOf(HTMLDivElement);
  });

  it('matches the rendered snapshot', () => {
    const { container } = render(
      <Field>
        <FieldLabel>Email</FieldLabel>
        <Input />
      </Field>,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  describe('accessibility (axe)', () => {
    const themes = [
      { name: 'light', theme: undefined },
      { name: 'dark', theme: 'dark' },
    ] as const;

    for (const { name, theme } of themes) {
      it(`no violations — full field, valid + invalid / ${name}`, async () => {
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
            <Field>
              <FieldLabel>Name</FieldLabel>
              <Input />
              <FieldDescription>Your full name.</FieldDescription>
            </Field>
            <Field invalid>
              <FieldLabel>Email</FieldLabel>
              <Input />
              <FieldError>Enter a valid email.</FieldError>
            </Field>
          </div>,
          { theme },
        );
        await expectNoA11yViolations(container);
      });
    }
  });
});

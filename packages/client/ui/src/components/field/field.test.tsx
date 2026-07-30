import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Field } from './field.component.js';
import { FieldLabel } from '../field-label/field-label.component.js';
import { FieldDescription } from '../field-description/field-description.component.js';
import { FieldError } from '../field-error/field-error.component.js';
import { Input } from '../input/input.component.js';
import { useField } from './use-field.js';
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

  it('the control’s own aria-invalid overrides the field, and its describedby merges', async () => {
    render(
      <Field invalid>
        <FieldLabel>Email</FieldLabel>
        <Input aria-invalid={false} aria-describedby="external-hint" />
        <FieldDescription>We’ll never share it.</FieldDescription>
      </Field>,
    );
    const input = screen.getByRole('textbox');
    // aria-invalid: the control's explicit false wins over the field's invalid.
    expect(input).toHaveAttribute('aria-invalid', 'false');
    // aria-describedby MERGES the field's description with the control's own.
    const desc = screen.getByText('We’ll never share it.');
    await waitFor(() => {
      const describedBy = input.getAttribute('aria-describedby') ?? '';
      expect(describedBy).toContain(desc.id);
      expect(describedBy).toContain('external-hint');
    });
  });

  it('owns the control id so the label always associates (own id is ignored)', () => {
    render(
      <Field>
        <FieldLabel>Email</FieldLabel>
        <Input id="ignored" />
      </Field>,
    );
    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(input.id).not.toBe('ignored');
    expect(screen.getByText('Email')).toHaveAttribute('for', input.id);
  });

  it('describes the control with SEVERAL descriptions, in DOM order', async () => {
    render(
      <Field>
        <FieldLabel>Password</FieldLabel>
        <Input />
        <FieldDescription>At least 8 characters.</FieldDescription>
        <FieldDescription>One number.</FieldDescription>
      </Field>,
    );
    const input = screen.getByRole('textbox', { name: 'Password' });
    const a = screen.getByText('At least 8 characters.');
    const b = screen.getByText('One number.');
    // Asserted as an ORDERED list: aria-describedby order is announcement order,
    // and a `toContain` pair per id (what this test used to do) cannot see it.
    await waitFor(() =>
      expect(input.getAttribute('aria-describedby')?.split(' ')).toEqual([
        a.id,
        b.id,
      ]),
    );
  });

  it('warns when more than one control shares a Field', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(
      <Field>
        <FieldLabel>Two</FieldLabel>
        <Input aria-label="a" />
        <Input aria-label="b" />
      </Field>,
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('more than one control'),
    );
  });

  it('leaves a standalone control (no Field) untouched', () => {
    render(<Input aria-label="Solo" />);
    const input = screen.getByRole('textbox', { name: 'Solo' });
    expect(input).not.toHaveAttribute('aria-describedby');
    expect(input).not.toHaveAttribute('aria-invalid');
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

  // The escape hatch for a control the DS does not own: it cannot read the context
  // itself, so the wiring is handed over as prop getters.
  describe('useField (prop getters)', () => {
    function ThirdParty(props: { placeholder?: string }) {
      const { getLabelProps, getControlProps } = useField();
      return (
        <>
          <label {...getLabelProps()}>Born on</label>
          <input {...getControlProps({ placeholder: props.placeholder })} />
        </>
      );
    }

    it('associates a raw label and control, and describes them', async () => {
      render(
        <Field>
          <ThirdParty />
          <FieldDescription>Day/month/year.</FieldDescription>
        </Field>,
      );
      const input = screen.getByRole('textbox', { name: 'Born on' });
      const desc = screen.getByText('Day/month/year.');
      expect(screen.getByText('Born on')).toHaveAttribute('for', input.id);
      await waitFor(() =>
        expect(input.getAttribute('aria-describedby')).toContain(desc.id),
      );
    });

    it('carries the field’s invalid state', () => {
      render(
        <Field invalid>
          <ThirdParty />
        </Field>,
      );
      expect(screen.getByRole('textbox')).toHaveAttribute(
        'aria-invalid',
        'true',
      );
    });

    it('MERGES the caller’s own props rather than replacing them', () => {
      render(
        <Field>
          <ThirdParty placeholder="dd/mm/yyyy" />
        </Field>,
      );
      expect(screen.getByRole('textbox')).toHaveAttribute(
        'placeholder',
        'dd/mm/yyyy',
      );
    });

    it('counts as the field’s one control', () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      render(
        <Field>
          <ThirdParty />
          <Input aria-label="second" />
        </Field>,
      );
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('more than one control'),
      );
    });

    it('warns and wires nothing when called outside a Field', () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      render(<ThirdParty />);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('useField: called outside a <Field>'),
      );
      const input = screen.getByRole('textbox');
      expect(input).not.toHaveAttribute('aria-describedby');
      expect(input).not.toHaveAttribute('aria-invalid');
    });
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

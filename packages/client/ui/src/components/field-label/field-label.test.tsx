import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import type { ReactNode } from 'react';
import { FieldLabel } from './field-label.component.js';
import { Field } from '../field/field.component.js';
import { Input } from '../input/input.component.js';

/** The label's whole job is to point at the field's control, so almost every test
 *  needs the container. Declared once here rather than repeated per case. */
const renderInField = (node: ReactNode) =>
  render(
    <Field>
      {node}
      <Input />
    </Field>,
  );

describe('FieldLabel', () => {
  afterEach(() => vi.restoreAllMocks());

  it('takes its name from the label and targets the control', () => {
    renderInField(<FieldLabel>Email</FieldLabel>);
    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(screen.getByText('Email')).toHaveAttribute('for', input.id);
    expect(input.id).toBeTruthy();
  });

  it('focuses the control when clicked', async () => {
    renderInField(<FieldLabel>Email</FieldLabel>);
    await browser.click(screen.getByText('Email'));
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveFocus();
  });

  it('warns when used outside a Field, where it points at nothing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<FieldLabel>Orphan</FieldLabel>);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('FieldLabel: used outside a <Field>'),
    );
  });

  it('forwards ref to the label element', () => {
    let el: HTMLElement | null = null;
    renderInField(
      <FieldLabel
        ref={(node) => {
          el = node;
        }}
      >
        Email
      </FieldLabel>,
    );
    expect(el).toBeInstanceOf(HTMLLabelElement);
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { FieldError } from './field-error.component.js';
import { Field } from '../field/field.component.js';
import { Fieldset } from '../fieldset/fieldset.component.js';
import { FieldsetLegend } from '../fieldset-legend/fieldset-legend.component.js';
import { Input } from '../input/input.component.js';

/** This part describes whichever container is NEAREST, so both hosts appear here.
 *  Declared once rather than rebuilt per case. */
const inField = (node: ReactNode) =>
  render(
    <Field>
      <Input aria-label="Control" />
      {node}
    </Field>,
  );
const inFieldset = (node: ReactNode) =>
  render(
    <Fieldset>
      <FieldsetLegend>Group</FieldsetLegend>
      {node}
    </Fieldset>,
  );

describe('FieldError', () => {
  afterEach(() => vi.restoreAllMocks());

  it('describes the CONTROL when inside a Field', async () => {
    inField(<FieldError>Some text.</FieldError>);
    const control = screen.getByRole('textbox');
    const part = screen.getByText('Some text.');
    await waitFor(() =>
      expect(control.getAttribute('aria-describedby')).toContain(part.id),
    );
  });

  it('describes the GROUP when inside a Fieldset', async () => {
    inFieldset(<FieldError>Some text.</FieldError>);
    const group = screen.getByRole('group', { name: 'Group' });
    const part = screen.getByText('Some text.');
    await waitFor(() =>
      expect(group.getAttribute('aria-describedby')).toContain(part.id),
    );
  });

  // Every React-empty value, not just `false`: the empty ARRAY is the one a
  // consumer actually hits, since mapping a validation array is the idiomatic
  // shape. Each would otherwise render a blank <p> and be pointed at.
  it.each([
    ['an empty array', [] as never],
    ['a boolean', true],
    ['whitespace', '   '],
    ['null', null],
    ['undefined', undefined],
  ])('renders nothing, and registers nothing, for %s', (_label, children) => {
    inFieldset(<FieldError>{children}</FieldError>);
    const group = screen.getByRole('group', { name: 'Group' });
    expect(group).not.toHaveAttribute('aria-describedby');
    expect(group.querySelector('p')).toBeNull();
  });

  it('renders 0 — React renders it, so it is not empty', async () => {
    inFieldset(<FieldError>{0}</FieldError>);
    const group = screen.getByRole('group', { name: 'Group' });
    await waitFor(() => expect(group).toHaveAttribute('aria-describedby'));
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('owns its id, so a consumer id cannot leave the reference dangling', async () => {
    inFieldset(<FieldError id="mine">Some text.</FieldError>);
    const group = screen.getByRole('group', { name: 'Group' });
    await waitFor(() => expect(group).toHaveAttribute('aria-describedby'));
    const describedBy = group.getAttribute('aria-describedby') as string;
    expect(document.getElementById(describedBy)).toBe(
      screen.getByText('Some text.'),
    );
    expect(describedBy).not.toBe('mine');
  });

  it('warns when it sits in no describable container', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<FieldError>Orphan</FieldError>);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'FieldError: used outside a <Field> or <Fieldset>',
      ),
    );
  });

  it('drops its id from aria-describedby when its content clears', async () => {
    const { rerender } = render(
      <Fieldset>
        <FieldsetLegend>Group</FieldsetLegend>
        <FieldError>Some text.</FieldError>
      </Fieldset>,
    );
    const group = screen.getByRole('group', { name: 'Group' });
    await waitFor(() => expect(group).toHaveAttribute('aria-describedby'));
    rerender(
      <Fieldset>
        <FieldsetLegend>Group</FieldsetLegend>
        <FieldError>{null}</FieldError>
      </Fieldset>,
    );
    await waitFor(() => expect(group).not.toHaveAttribute('aria-describedby'));
  });
});

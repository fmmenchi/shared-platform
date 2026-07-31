import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Field } from './field.component.js';
import { FieldLabel } from '../field-label/field-label.component.js';
import { FieldDescription } from '../field-description/field-description.component.js';
import { FieldError } from '../field-error/field-error.component.js';
import { Input } from '../input/input.component.js';
import { Checkbox } from '../checkbox/checkbox.component.js';
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

  // The shorthand exists to remove the four-tag boilerplate of an ordinary
  // field. It must produce EXACTLY what composing the parts produces — if the
  // two diverge, the escape hatch stops being an escape hatch.
  describe('shorthand props', () => {
    it('labels, describes and errors the control from props alone', async () => {
      render(
        <Field label="Email" hint="Work address" error="Required">
          <Input />
        </Field>,
      );
      const input = screen.getByRole('textbox', { name: 'Email' });
      await waitFor(() =>
        expect(input).toHaveAccessibleDescription('Work address Required'),
      );
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('announces hint before error, whichever order the ids register in', async () => {
      render(
        <Field label="Email" hint="Work address" error="Required">
          <Input />
        </Field>,
      );
      const input = screen.getByRole('textbox', { name: 'Email' });
      const hint = screen.getByText('Work address');
      const error = screen.getByText('Required');
      await waitFor(() =>
        expect(input.getAttribute('aria-describedby')?.split(' ')).toEqual([
          hint.id,
          error.id,
        ]),
      );
    });

    it('renders the same wiring as the composed form', async () => {
      const { container: shorthand } = render(
        <Field label="Email" hint="Work address" error="Required">
          <Input />
        </Field>,
      );
      const { container: composed } = render(
        <Field invalid>
          <FieldLabel>Email</FieldLabel>
          <Input />
          <FieldDescription>Work address</FieldDescription>
          <FieldError>Required</FieldError>
        </Field>,
      );
      // ids differ per instance (useId), so compare the SHAPE: tag names and the
      // attributes that carry the wiring, with every generated id masked out.
      const shape = (root: HTMLElement) =>
        [...root.querySelectorAll('*')].map((n) => ({
          tag: n.tagName,
          text: n.textContent,
          for: n.getAttribute('for') != null,
          describedBy: (n.getAttribute('aria-describedby') ?? '').split(' ')
            .length,
          invalid: n.getAttribute('aria-invalid'),
        }));
      await waitFor(() => expect(shape(shorthand)).toEqual(shape(composed)));
    });

    it('an empty error neither shows nor marks the field invalid', () => {
      // The idiomatic call is unconditional — `error={errors.email?.message}`
      // with no error is `undefined`, and must not light the field up.
      render(
        <Field label="Email" error={undefined}>
          <Input />
        </Field>,
      );
      const input = screen.getByRole('textbox', { name: 'Email' });
      expect(input).not.toHaveAttribute('aria-invalid');
      expect(input).not.toHaveAttribute('aria-describedby');
    });

    it('an explicit invalid wins over the inferred one', () => {
      render(
        <Field label="Email" invalid error={undefined}>
          <Input />
        </Field>,
      );
      expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAttribute(
        'aria-invalid',
        'true',
      );
    });

    it('warns when a label prop and a composed FieldLabel are both present', () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      render(
        <Field label="Email">
          <FieldLabel>Also email</FieldLabel>
          <Input />
        </Field>,
      );
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('more than one label'),
      );
    });

    it('does NOT count a label that belongs to a nested control', () => {
      // A checkbox-style row wraps its own control in a <label>. That is the
      // control's label, not a second one for the field — no warning.
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      render(
        <Field hint="Pick one">
          <label>
            <Input aria-label="inner" /> Accept
          </label>
        </Field>,
      );
      expect(warn).not.toHaveBeenCalledWith(
        expect.stringContaining('more than one label'),
      );
    });
  });

  // The second anatomy: a single checkbox or radio, where the control leads and
  // the label sits beside it. Same component, same wiring — only the layout and
  // the DOM order of the two change.
  describe('horizontal orientation', () => {
    const renderRow = () =>
      renderUi(
        <Field
          label="Accept the terms"
          hint="You can withdraw consent later."
          error="Required to continue."
          orientation="horizontal"
          style={{ inlineSize: '20rem' }}
        >
          <Checkbox />
        </Field>,
      );

    it('still labels and describes the control', async () => {
      renderRow();
      const box = screen.getByRole('checkbox', { name: 'Accept the terms' });
      await waitFor(() =>
        expect(box).toHaveAccessibleDescription(
          'You can withdraw consent later. Required to continue.',
        ),
      );
      expect(box).toHaveAttribute('aria-invalid', 'true');
    });

    it('puts the control BEFORE its label in the DOM, not only on screen', () => {
      // Reading order should match visual order rather than being reshuffled by
      // the grid (WCAG 1.3.2).
      const { container } = renderRow();
      const parts = [...container.querySelectorAll('input, label')];
      expect(parts.map((n) => n.tagName)).toEqual(['INPUT', 'LABEL']);
    });

    it('places the label beside the control, not under it', () => {
      const { container } = renderRow();
      const box = (
        container.querySelector('input') as HTMLElement
      ).getBoundingClientRect();
      const label = (
        container.querySelector('label') as HTMLElement
      ).getBoundingClientRect();
      expect(label.left).toBeGreaterThan(box.right);
      // Same line: their vertical centres coincide.
      expect(
        Math.abs((box.top + box.bottom) / 2 - (label.top + label.bottom) / 2),
      ).toBeLessThan(1);
    });

    it('aligns hint and error under the LABEL, not under the control', () => {
      const { container } = renderRow();
      const label = (
        container.querySelector('label') as HTMLElement
      ).getBoundingClientRect();
      const texts = [...container.querySelectorAll('p')].map((n) =>
        n.getBoundingClientRect(),
      );
      expect(texts).toHaveLength(2);
      for (const t of texts) {
        expect(Math.abs(t.left - label.left)).toBeLessThan(1);
        expect(t.top).toBeGreaterThan(label.bottom - 1);
      }
    });

    it('stacks label above control when vertical (the default)', () => {
      const { container } = renderUi(
        <Field label="Email">
          <Input />
        </Field>,
      );
      const input = (
        container.querySelector('input') as HTMLElement
      ).getBoundingClientRect();
      const label = (
        container.querySelector('label') as HTMLElement
      ).getBoundingClientRect();
      expect(label.bottom).toBeLessThanOrEqual(input.top);
    });

    it('lays out the same when the parts are composed by hand', () => {
      // Placement is by ELEMENT, not by position, so composing in any order
      // gives the same result — otherwise the escape hatch would drift.
      const { container } = renderUi(
        <Field orientation="horizontal" style={{ inlineSize: '20rem' }}>
          <Checkbox />
          <FieldLabel>Accept the terms</FieldLabel>
          <FieldError>Required to continue.</FieldError>
        </Field>,
      );
      const box = (
        container.querySelector('input') as HTMLElement
      ).getBoundingClientRect();
      const label = (
        container.querySelector('label') as HTMLElement
      ).getBoundingClientRect();
      const err = (
        container.querySelector('p') as HTMLElement
      ).getBoundingClientRect();
      expect(label.left).toBeGreaterThan(box.right);
      expect(Math.abs(err.left - label.left)).toBeLessThan(1);
    });
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

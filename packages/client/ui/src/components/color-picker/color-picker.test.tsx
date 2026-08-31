import { describe, it, expect } from 'vitest';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { ColorPicker } from './color-picker.component.js';
import { Field } from '../field/field.component.js';
import { FieldLabel } from '../field-label/field-label.component.js';
import { FieldDescription } from '../field-description/field-description.component.js';
import { expectNoA11yViolations } from '../../test/axe.js';

describe('ColorPicker', () => {
  it('is a native colour input, and the type is not negotiable', () => {
    const { container } = render(<ColorPicker aria-label="Brand colour" />);
    const input = container.querySelector('input');

    // `type` is the component rather than a prop: there is nothing else this
    // could be, and letting it be overridden would make the styles a lie.
    expect(input?.type).toBe('color');
  });

  it('holds an sRGB hex, lowercased, because that is what the platform gives', () => {
    // Stated in a test rather than only in prose: a consumer working in oklch has
    // to convert, and a component that hid this would be pretending to speak a
    // colour space the browser does not hand it.
    render(<ColorPicker aria-label="Brand colour" defaultValue="#635BFF" />);

    expect(screen.getByLabelText('Brand colour')).toHaveValue('#635bff');
  });

  it('takes its name and description from a Field, without being told', () => {
    render(
      <Field>
        <FieldLabel>Brand colour</FieldLabel>
        <ColorPicker name="primary" />
        <FieldDescription>Used for the primary action.</FieldDescription>
      </Field>,
    );

    const input = screen.getByLabelText('Brand colour');
    expect(input).toHaveAccessibleDescription('Used for the primary action.');
  });

  it("lets the consumer's own props win over the Field wiring", () => {
    render(
      <Field>
        <FieldLabel>Brand colour</FieldLabel>
        <ColorPicker aria-label="Something better" />
      </Field>,
    );

    expect(screen.getByLabelText('Something better')).toBeTruthy();
  });

  it('is a form control: it submits its value under its name', () => {
    render(
      <form aria-label="theme">
        <ColorPicker
          aria-label="Brand colour"
          name="primary"
          defaultValue="#112233"
        />
      </form>,
    );

    const data = new FormData(screen.getByRole('form') as HTMLFormElement);
    expect(data.get('primary')).toBe('#112233');
  });

  it('resets with its form, because the DOM holds the value', () => {
    // The reason there is no `useControlled` here: the browser paints this
    // control, so the DOM owns its state — and a component that mirrored it would
    // break `form.reset()`, which is measured elsewhere in this package.
    render(
      <form aria-label="theme">
        <ColorPicker
          aria-label="Brand colour"
          name="primary"
          defaultValue="#112233"
        />
      </form>,
    );

    const input = screen.getByLabelText('Brand colour') as HTMLInputElement;
    input.value = '#445566';
    (screen.getByRole('form') as HTMLFormElement).reset();

    expect(input.value).toBe('#112233');
  });

  it('forwards a ref to the input', () => {
    const ref = createRef<HTMLInputElement>();
    render(<ColorPicker aria-label="Brand colour" ref={ref} />);

    expect(ref.current?.type).toBe('color');
  });

  it('has no axe violations, labelled or in a Field', async () => {
    const { container: bare } = render(
      <ColorPicker aria-label="Brand colour" />,
    );
    await expectNoA11yViolations(bare);

    const { container: field } = render(
      <Field>
        <FieldLabel>Brand colour</FieldLabel>
        <ColorPicker name="primary" />
      </Field>,
    );
    await expectNoA11yViolations(field);
  });
});

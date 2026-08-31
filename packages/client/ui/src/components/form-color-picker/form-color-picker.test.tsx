import { describe, it, expect, vi } from 'vitest';
import { createRef, useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { FormColorPicker } from './form-color-picker.component.js';
import { UiProvider } from '../../i18n/provider.js';
import { expectNoA11yViolations } from '../../test/axe.js';
import type { UseFormField } from '../../form/form-adapter.types.js';

/**
 * Tested against the CONTRACT, with a hand-written adapter and no form library —
 * which is also the strongest statement of what the contract is. That it holds
 * against real libraries is proved next door in `ui-ports-validation`, where they
 * are installed.
 */
const bare: UseFormField = (name) => ({ control: { name } });

const provider = (field: UseFormField, children: React.ReactNode) => (
  <UiProvider adapters={{ i18n: { locale: 'en' }, form: { field } }}>
    {children}
  </UiProvider>
);

describe('FormColorPicker', () => {
  it('binds the control and labels it, with nothing to report', () => {
    render(
      provider(bare, <FormColorPicker name="primary" label="Brand colour" />),
    );

    const input = screen.getByLabelText('Brand colour');
    expect(input).toHaveAttribute('name', 'primary');
    expect(input).toHaveAttribute('type', 'color');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('collects what a person picks, through the adapter’s own onChange', async () => {
    function Host() {
      const [value, setValue] = useState('#000000');
      const field: UseFormField = (name) => ({
        control: {
          name,
          value,
          onChange: (event) =>
            setValue((event.target as HTMLInputElement).value),
        },
      });
      return provider(
        field,
        <>
          <FormColorPicker name="primary" label="Brand colour" />
          <output>{value}</output>
        </>,
      );
    }
    render(<Host />);

    const input = screen.getByLabelText('Brand colour') as HTMLInputElement;

    // NOT `input.value = …`, and the first version of this test failed because of
    // it. An OS colour picker cannot be driven by `userEvent` — there is no text to
    // type and no option to click — so the change has to be synthesised. But the
    // binding passes `value`, which makes this a CONTROLLED input: React tracks the
    // last value it wrote and reverts a direct assignment before the handler ever
    // sees it. Going through the prototype's setter is what makes React's tracker
    // observe the new value, which is the documented way to simulate this and the
    // only one that exercises the real path.
    const setValue = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )?.set;
    setValue?.call(input, '#635bff');
    input.dispatchEvent(new Event('input', { bubbles: true }));

    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toBe('#635bff');
    });
  });

  it('renders each error as its OWN element, and marks the control invalid', async () => {
    // A colour can fail in more than one way at once — out of gamut AND too close
    // to its neighbour — and joining the messages would read as one run-on
    // sentence to a screen reader.
    const field: UseFormField = (name) => ({
      control: { name },
      errors: ['Outside sRGB.', 'Too close to secondary.'],
    });
    const { container } = render(
      provider(field, <FormColorPicker name="primary" label="Brand colour" />),
    );

    expect(screen.getByLabelText('Brand colour')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getByText('Outside sRGB.')).toBeTruthy();
    expect(screen.getByText('Too close to secondary.')).toBeTruthy();
    await expectNoA11yViolations(container);
  });

  it('keeps the hint BEFORE the errors, however many there are', () => {
    const field: UseFormField = (name) => ({
      control: { name },
      errors: ['Outside sRGB.'],
    });
    const { container } = render(
      provider(
        field,
        <FormColorPicker
          name="primary"
          label="Brand colour"
          hint="Used for the primary action."
        />,
      ),
    );

    const text = (container.textContent ?? '').replace(/\s+/g, ' ');
    expect(text.indexOf('Used for the primary action.')).toBeLessThan(
      text.indexOf('Outside sRGB.'),
    );
  });

  it('describes the control with the hint AND the errors', () => {
    const field: UseFormField = (name) => ({
      control: { name },
      errors: ['Outside sRGB.'],
    });
    render(
      provider(
        field,
        <FormColorPicker name="primary" label="Brand colour" hint="A hint." />,
      ),
    );

    expect(screen.getByLabelText('Brand colour')).toHaveAccessibleDescription(
      /A hint\.[\s\S]*Outside sRGB\./,
    );
  });

  it('lets a call-site prop win over the binding', () => {
    // NOT `defaultValue`, and the compiler is right to refuse it: the binding owns
    // the value, so a starting colour comes from the form's `defaultValues` rather
    // than from the field. `ColorPicker` standalone takes one; bound, it cannot.
    render(
      provider(
        bare,
        <FormColorPicker name="primary" label="Brand colour" disabled />,
      ),
    );

    expect(screen.getByLabelText('Brand colour')).toBeDisabled();
  });

  it('WARNS when the call site passes what the binding owns', () => {
    // `value` or `onChange` from the call site does not override the binding, it
    // severs it — so the prop is dropped and said out loud.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    render(
      provider(
        bare,
        // @ts-expect-error — the type refuses it; the warning is for the callers
        // TypeScript does not see.
        <FormColorPicker name="primary" label="Brand colour" value="#112233" />,
      ),
    );

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('FormColorPicker'),
    );
    warn.mockRestore();
  });

  it('merges its ref with the binding’s', () => {
    const ref = createRef<HTMLInputElement>();
    const bindingRef = vi.fn();
    const field: UseFormField = (name) => ({
      control: { name, ref: bindingRef },
    });

    render(
      provider(
        field,
        <FormColorPicker name="primary" label="Brand colour" ref={ref} />,
      ),
    );

    expect(ref.current?.type).toBe('color');
    expect(bindingRef).toHaveBeenCalled();
  });
});

import type { ComponentProps } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { FormTimeInput } from './form-time-input.component.js';
import { UiProvider } from '../../i18n/provider.js';
import { expectNoA11yViolations } from '../../test/axe.js';
import type { UseFormField } from '../../form/form-adapter.types.js';

/**
 * Render a bound field with a hand-written adapter, so the test names no form
 * library — and can therefore stand in for any of them by varying only what the
 * adapter puts in `control`, which is exactly where the date field's defects
 * were.
 */
function renderBound(
  field: UseFormField,
  ui: React.ReactNode,
  locale = 'en-US',
): HTMLElement {
  const { container } = render(
    <UiProvider adapters={{ i18n: { locale }, form: { field } }}>
      <form>{ui}</form>
    </UiProvider>,
  );
  return container;
}

function carrier(container: HTMLElement): HTMLInputElement {
  const node = container.querySelector('[data-carrier]');
  if (node === null) throw new Error('no carrier in the rendered output');
  return node as HTMLInputElement;
}

describe('FormTimeInput', () => {
  it('names the field once, with a label rather than a legend', () => {
    renderBound(
      (name) => ({ control: { name }, errors: [] }),
      <FormTimeInput name="opens" label="Opens at" />,
    );
    expect(
      screen.getByRole('textbox', { name: 'Opens at' }),
    ).toBeInTheDocument();
    // One text field composes with `Field`, not `Fieldset`: a group is what a
    // radio set is, and this is not one.
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  describe('the binding sees HH:mm, whatever the user saw', () => {
    it('hands the change event off the carrier', async () => {
      const onChange = vi.fn();
      renderBound(
        (name) => ({ control: { name, onChange }, errors: [] }),
        <FormTimeInput name="opens" label="Opens at" />,
      );
      const field = screen.getByRole('textbox');
      await browser.click(field);
      await browser.keyboard('0230p');

      const event = onChange.mock.lastCall?.[0] as {
        target: HTMLInputElement;
      };
      // The field showed `02:30 PM`; the library is told `14:30`.
      expect(field).toHaveValue('02:30 PM');
      expect(event.target.value).toBe('14:30');
      expect(event.target.name).toBe('opens');
    });

    it('gives the binding a ref to the CARRIER, so a library reading .value gets ISO', async () => {
      // A holder rather than a `let`: assigned only inside a callback,
      // TypeScript narrows a plain variable to `never`.
      const held: { node: HTMLInputElement | null } = { node: null };
      const container = renderBound(
        (name) => ({
          control: {
            name,
            ref: (node: HTMLInputElement | null) => {
              held.node = node;
            },
          },
          errors: [],
        }),
        <FormTimeInput name="opens" label="Opens at" />,
      );
      await browser.click(screen.getByRole('textbox'));
      await browser.keyboard('0230p');

      expect(held.node).not.toBeNull();
      expect(held.node).toBe(carrier(container));
      expect(held.node?.value).toBe('14:30');
    });

    it('never lets a schemas `type` turn the field back into the native control', () => {
      // `types: { opens: 'time' }` is the natural thing to declare for a time,
      // and forwarding it would re-create the very control ADR-0027 refuses —
      // drawing `14:30` on a page whose `Time` says `02:30 PM`.
      renderBound(
        (name) => ({
          control: {
            name,
            type: 'time',
            pattern: '\\d{2}:\\d{2}',
            min: '09:00',
          },
          errors: [],
        }),
        <FormTimeInput name="opens" label="Opens at" />,
      );
      const field = screen.getByRole('textbox');
      expect(field).toHaveAttribute('type', 'text');
      expect(field).not.toHaveAttribute('pattern');
      expect(field).not.toHaveAttribute('min');
    });

    it('forwards what the library needs, including the form it is outside of', () => {
      const container = renderBound(
        (name) => ({
          control: {
            name,
            required: true,
            id: 'opens-field',
            form: 'elsewhere',
          },
          errors: [],
        }),
        <FormTimeInput name="opens" label="Opens at" />,
      );
      expect(screen.getByRole('textbox')).toBeRequired();
      // `form` belongs with the `name`, on the carrier — it is what associates a
      // control with a `<form>` it is not inside, and the visible field has no
      // name to associate.
      expect(carrier(container)).toHaveAttribute('form', 'elsewhere');
    });
  });

  describe('the seed', () => {
    it('takes a starting value under either name a library uses', () => {
      // Conform emits `defaultValue`; Formik and TanStack emit `value`.
      const asDefault = renderBound(
        (name) => ({ control: { name, defaultValue: '14:30' }, errors: [] }),
        <FormTimeInput name="a" label="A" />,
      );
      expect(carrier(asDefault)).toHaveValue('14:30');
      expect(screen.getByRole('textbox')).toHaveValue('02:30 PM');
      asDefault.remove();

      const asValue = renderBound(
        (name) => ({ control: { name, value: '21:05' }, errors: [] }),
        <FormTimeInput name="b" label="B" />,
      );
      expect(carrier(asValue)).toHaveValue('21:05');
      expect(screen.getByRole('textbox')).toHaveValue('09:05 PM');
    });

    it('never controls the visible field with the ISO string', () => {
      // Passed through as `value`, the box would read `14:30` on a page whose
      // every other time reads `02:30 PM`.
      renderBound(
        (name) => ({ control: { name, value: '14:30' }, errors: [] }),
        <FormTimeInput name="opens" label="Opens at" />,
      );
      expect(screen.getByRole('textbox')).toHaveValue('02:30 PM');
    });

    it('follows a controlled adapter that moves the value after the first render', async () => {
      // A controlled binding hands over `value` and NO ref, so nothing it does
      // later reaches the field on its own — the seed is a one-shot. The bound
      // carrier is what carries the move through.
      function Moving() {
        const field: UseFormField = (name) => ({
          control: { name, value: held.value },
          errors: [],
        });
        return (
          <UiProvider adapters={{ i18n: { locale: 'en-US' }, form: { field } }}>
            <form>
              <FormTimeInput name="opens" label="Opens at" />
            </form>
          </UiProvider>
        );
      }
      const held = { value: '09:00' };
      const { rerender } = render(<Moving />);
      expect(screen.getByRole('textbox')).toHaveValue('09:00 AM');

      held.value = '21:05';
      rerender(<Moving />);
      await vi.waitFor(() => {
        expect(screen.getByRole('textbox')).toHaveValue('09:05 PM');
      });
    });

    it('refuses defaultTime, which would seed the DOM behind the librarys back', () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      // Cast rather than suppressed, because that is precisely what is being
      // tested: the type refuses `defaultTime`, and this stands in for the
      // callers the type does not see — JavaScript, a spread, a prop object
      // typed somewhere else.
      const unseen = {
        name: 'opens',
        label: 'Opens at',
        defaultTime: { hour: 9, minute: 0 },
      } as unknown as ComponentProps<typeof FormTimeInput>;
      renderBound(
        (name) => ({ control: { name }, errors: [] }),
        <FormTimeInput {...unseen} />,
      );
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('`defaultTime` is the binding'),
      );
      warn.mockRestore();
    });
  });

  describe('what it says when it is wrong', () => {
    it('renders every message as its own statement, and marks the field invalid', () => {
      renderBound(
        (name) => ({
          control: { name },
          errors: ['Required', 'Must be after opening time'],
        }),
        <FormTimeInput name="opens" label="Opens at" hint="When doors open" />,
      );
      const field = screen.getByRole('textbox');
      expect(field).toHaveAttribute('aria-invalid', 'true');
      expect(field).toHaveAccessibleDescription(
        expect.stringContaining('Required') as unknown as string,
      );
      expect(
        screen.getByText('Must be after opening time'),
      ).toBeInTheDocument();
    });

    it('has no a11y violations, hint and errors included', async () => {
      const container = renderBound(
        (name) => ({ control: { name }, errors: ['Required'] }),
        <FormTimeInput name="opens" label="Opens at" hint="When doors open" />,
      );
      await expectNoA11yViolations(container);
    });
  });
});

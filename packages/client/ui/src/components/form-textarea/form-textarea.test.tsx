import { describe, it, expect, vi } from 'vitest';
import { createRef, useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormTextarea } from './form-textarea.component.js';
import { UiProvider } from '../../i18n/provider.js';
import type { UseFormField } from '../../form/form-adapter.types.js';

/**
 * The same contract as `FormInput`, against the same hand-written adapter — the
 * point being that the port carries a multi-line control with nothing new in
 * it. What IS new is the tag: the adapter's props are tag-agnostic, its `ref`
 * and handlers are not, and the component is where that is resolved.
 */
describe('FormTextarea, against the contract itself', () => {
  const provider = (field: UseFormField, children: React.ReactNode) => (
    <UiProvider adapters={{ i18n: { locale: 'en' }, form: { field } }}>
      {children}
    </UiProvider>
  );

  it('binds a multi-line control and labels it', () => {
    const field: UseFormField = (name) => ({ control: { name } });
    render(
      provider(field, <FormTextarea name="notes" label="Notes" rows={4} />),
    );

    const control = screen.getByRole('textbox', { name: 'Notes' });
    expect(control.tagName).toBe('TEXTAREA');
    expect(control).toHaveAttribute('name', 'notes');
    expect(control).toHaveAttribute('rows', '4');
  });

  it('collects what the user types, through the adapter’s own onChange', async () => {
    const user = userEvent.setup();
    function Host() {
      const [value, setValue] = useState('');
      const field: UseFormField = (name) => ({
        control: {
          name,
          // `event.target.value` needs no cast: it is the one property all
          // three controls share, which is exactly why the port's bag of props
          // can be tag-agnostic in the first place.
          onChange: (event) => setValue(event.target.value),
        },
      });
      return (
        <>
          <output>{value}</output>
          {provider(field, <FormTextarea name="notes" label="Notes" />)}
        </>
      );
    }
    render(<Host />);

    await user.type(screen.getByRole('textbox', { name: 'Notes' }), 'ab');
    expect(screen.getByRole('status')).toHaveTextContent('ab');
  });

  it('renders every message, and the hint keeps its place before them', async () => {
    const field: UseFormField = (name) => ({
      control: { name },
      errors: ['Too short.', 'No links, please.'],
    });
    render(
      provider(
        field,
        <FormTextarea name="notes" label="Notes" hint="Markdown is fine." />,
      ),
    );

    const control = screen.getByRole('textbox', { name: 'Notes' });
    await waitFor(() =>
      expect(control).toHaveAccessibleDescription(
        'Markdown is fine. Too short. No links, please.',
      ),
    );
    expect(control).toHaveAttribute('aria-invalid', 'true');
  });

  it('shares the ref, and drops what the binding owns', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const user = userEvent.setup();
    const seen: string[] = [];
    const bindingRef = createRef<HTMLTextAreaElement>();
    const callSiteRef = createRef<HTMLTextAreaElement>();
    const stolen = vi.fn();
    const field: UseFormField = (name) => ({
      control: {
        name,
        ref: bindingRef as never,
        onChange: (event) => seen.push(event.target.value),
      },
    });
    // What a JavaScript consumer can still do, and TypeScript cannot see.
    const forced = { onChange: stolen, value: 'frozen' } as object;

    render(
      provider(
        field,
        <FormTextarea
          name="notes"
          label="Notes"
          ref={callSiteRef}
          {...forced}
        />,
      ),
    );

    const control = screen.getByRole('textbox', { name: 'Notes' });
    expect(bindingRef.current).toBe(control);
    expect(callSiteRef.current).toBe(control);

    await user.type(control, 'a');
    expect(seen).toEqual(['a']);
    expect(stolen).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('FormTextarea: `onChange`, `value` are owned'),
    );
    warn.mockRestore();
  });

  it('throws by name when there is no binding in scope', () => {
    const error = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    expect(() => render(<FormTextarea name="notes" label="Notes" />)).toThrow(
      /FormTextarea: no form binding in scope/,
    );
    error.mockRestore();
  });
});

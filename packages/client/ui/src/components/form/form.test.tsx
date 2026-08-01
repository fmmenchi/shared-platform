import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Form } from './form.component.js';
import { FormInput } from '../form-input/form-input.component.js';
import { FormSubmit } from '../form-submit/form-submit.component.js';
import { Input } from '../input/input.component.js';
import { Field } from '../field/field.component.js';
import type { UseFormField } from '../../form/form-adapter.types.js';

const field: UseFormField = (name) => ({ control: { name } });

describe('Form', () => {
  it('renders ONE element — the form — and no wrapper', () => {
    const { container } = render(
      <Form field={field}>
        <FormInput name="email" label="Email" />
      </Form>,
    );
    // the adapter scope is context, so it costs no markup
    expect(container.firstElementChild?.tagName).toBe('FORM');
  });

  it('puts the adapter in scope for everything inside', () => {
    render(
      <Form field={field}>
        <FormInput name="email" label="Email" />
      </Form>,
    );
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAttribute(
      'name',
      'email',
    );
  });

  // The reason this is a component and not a bare <form> plus a provider.
  describe('noValidate', () => {
    it('is on by default, so YOUR handler actually runs', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
      render(
        <Form field={field} onSubmit={onSubmit}>
          <FormInput name="email" label="Email" required />
          <button type="submit">Go</button>
        </Form>,
      );
      await user.click(screen.getByRole('button', { name: 'Go' }));
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('with it OFF the browser blocks the submit entirely — the trap', async () => {
      // Measured, and the reason the default exists: a required field left to
      // native validation stops the submit before any handler is reached, and
      // shows a bubble competing with the FieldError beside it.
      const user = userEvent.setup();
      const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
      render(
        <Form field={field} noValidate={false} onSubmit={onSubmit}>
          <FormInput name="email" label="Email" required />
          <button type="submit">Go</button>
        </Form>,
      );
      await user.click(screen.getByRole('button', { name: 'Go' }));
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('a bare <form> has the trap — which is what this component removes', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
      render(
        <form onSubmit={onSubmit}>
          <Field label="Email">
            <Input name="email" required />
          </Field>
          <button type="submit">Go</button>
        </form>,
      );
      await user.click(screen.getByRole('button', { name: 'Go' }));
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  it('does not own submission — onSubmit is yours, untouched', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <Form field={field} onSubmit={onSubmit}>
        <button type="submit">Go</button>
      </Form>,
    );
    await user.click(screen.getByRole('button', { name: 'Go' }));
    expect(onSubmit.mock.calls[0]?.[0]).toBeInstanceOf(Object);
  });

  it('passes native form props through — action, method, id', () => {
    const { container } = render(
      <Form field={field} id="signup" method="post" action="/signup">
        <span />
      </Form>,
    );
    const form = container.querySelector('form') as HTMLFormElement;
    expect(form.id).toBe('signup');
    expect(form.getAttribute('method')).toBe('post');
    expect(form.getAttribute('action')).toBe('/signup');
  });

  it('works with a React 19 action, where no adapter status is needed', async () => {
    const user = userEvent.setup();
    let release: () => void = () => undefined;
    render(
      <Form
        field={field}
        action={async () => {
          await new Promise<void>((r) => {
            release = r;
          });
        }}
      >
        <FormSubmit>Save</FormSubmit>
      </Form>,
    );
    await user.click(screen.getByRole('button', { name: /Save/ }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Save/ })).toHaveAttribute(
        'aria-busy',
        'true',
      ),
    );
    release();
  });
});

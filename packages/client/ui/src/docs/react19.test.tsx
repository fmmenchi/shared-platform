import { describe, it, expect } from 'vitest';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent as browser } from 'vitest/browser';
import { Field } from '../components/field/field.component.js';
import { Input } from '../components/input/input.component.js';
import { Button } from '../components/button/button.component.js';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" isLoading={pending}>
      Save
    </Button>
  );
}

describe('React 19 form features', () => {
  it('useFormStatus dà pending con <form action>, senza adapter', async () => {
    let resolve: () => void = () => undefined;
    const action = async () => {
      await new Promise<void>((r) => {
        resolve = r;
      });
    };
    render(
      <form action={action}>
        <Field label="Email">
          <Input name="email" />
        </Field>
        <Submit />
      </form>,
    );
    const button = screen.getByRole('button', { name: /Save/ });
    expect(button).not.toHaveAttribute('aria-busy', 'true');

    await browser.click(button);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Save/ })).toHaveAttribute(
        'aria-busy',
        'true',
      ),
    );
    console.log('PENDING durante l azione = true');
    resolve();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Save/ })).not.toHaveAttribute(
        'aria-busy',
        'true',
      ),
    );
    console.log('PENDING dopo = false');
  });

  it('useActionState porta gli errori del server ai nostri campi', async () => {
    function App() {
      const [state, action] = useActionState(
        async (_prev: { email?: string }, data: FormData) => {
          const email = String(data.get('email') ?? '');
          return email.includes('@') ? {} : { email: 'Not an email address.' };
        },
        {},
      );
      return (
        <form action={action}>
          <Field label="Email" error={state.email}>
            <Input name="email" />
          </Field>
          <Submit />
        </form>
      );
    }
    render(<App />);
    await browser.type(screen.getByRole('textbox', { name: 'Email' }), 'nope');
    await browser.click(screen.getByRole('button', { name: /Save/ }));

    const input = screen.getByRole('textbox', { name: 'Email' });
    await waitFor(() =>
      expect(input).toHaveAccessibleDescription('Not an email address.'),
    );
    console.log('ERRORE DA useActionState = arrivato su aria-describedby');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });
});

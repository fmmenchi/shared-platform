import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormErrorSummary } from './form-error-summary.component.js';
import { FormInput } from '../form-input/form-input.component.js';
import { FormChoice } from '../form-choice/form-choice.component.js';
import { UiProvider } from '../../i18n/provider.js';
import type {
  UseFormErrors,
  UseFormField,
} from '../../form/form-adapter.types.js';

const LABELS: Record<string, string> = {
  email: 'Email',
  password: 'Password',
  tos: 'Terms and conditions',
};

/** A hand-rolled "form library", so the demo depends on none. */
function DemoForm() {
  const [values, setValues] = useState<Record<string, string | boolean>>({
    email: '',
    password: '',
    tos: false,
  });
  const [submitted, setSubmitted] = useState(false);

  const errors: Record<string, string[]> = {};
  if (submitted) {
    if (values.email === '') errors.email = ['Email is required.'];
    if (String(values.password).length < 8) {
      errors.password = ['At least 8 characters.', 'Must contain a digit.'];
    }
    if (values.tos !== true) errors.tos = ['You have to accept to continue.'];
  }

  const field: UseFormField = (name) => ({
    control: {
      name,
      onChange: (event) => {
        const el = event.target as HTMLInputElement;
        setValues((v) => ({
          ...v,
          [name]: el.type === 'checkbox' ? el.checked : el.value,
        }));
      },
    },
    errors: errors[name],
  });
  const formErrors: UseFormErrors = () => errors;

  return (
    <UiProvider
      adapters={{
        i18n: { locale: 'en' },
        form: { field: field, errors: formErrors },
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
        }}
        style={{
          display: 'grid',
          gap: 'var(--fm-space-stack-m)',
          maxWidth: '26rem',
        }}
      >
        <FormErrorSummary labelFor={(n) => LABELS[n] ?? n} />
        <FormInput name="email" label="Email" hint="We’ll never share it." />
        <FormInput name="password" label="Password" type="password" />
        <FormChoice name="tos" label="I accept the terms and conditions" />
        <button type="submit">Create account</button>
      </form>
    </UiProvider>
  );
}

const meta: Meta<typeof FormErrorSummary> = {
  title: 'Components/Form adapters/FormErrorSummary',
  component: FormErrorSummary,
  argTypes: {
    heading: {
      control: 'text',
      description: 'Says what happened. "There is a problem" beats "Errors".',
      table: { type: { summary: 'ReactNode' } },
    },
    labelFor: {
      control: false,
      description:
        'Turns a field name into the words a person recognises — without it the list shows the raw `name`, which is a database column.',
      table: { type: { summary: '(name: string) => ReactNode' } },
    },
  },
};
export default meta;

type Story = StoryObj<typeof FormErrorSummary>;

/**
 * Submit the empty form. The summary appears, takes focus, and each entry moves
 * focus to its field — try it with the keyboard.
 */
export const Default: Story = { render: () => <DemoForm /> };

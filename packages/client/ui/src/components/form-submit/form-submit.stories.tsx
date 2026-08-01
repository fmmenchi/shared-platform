import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormSubmit } from './form-submit.component.js';
import { FormErrorSummary } from '../form-error-summary/form-error-summary.component.js';
import { FormInput } from '../form-input/form-input.component.js';
import { FormChoice } from '../form-choice/form-choice.component.js';
import { FormAdapterProvider } from '../../form/form-adapter-provider.component.js';
import type {
  UseFormField,
  UseFormStatus,
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
    error: errors[name],
  });
  const status: UseFormStatus = () => ({ submitting: false, errors });

  return (
    <FormAdapterProvider field={field} status={status}>
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
        <FormSubmit>Create account</FormSubmit>
      </form>
    </FormAdapterProvider>
  );
}

const meta: Meta<typeof FormSubmit> = {
  title: 'Components/Inputs/FormSubmit',
  component: FormSubmit,
  argTypes: {
    children: { control: 'text', table: { type: { summary: 'ReactNode' } } },
  },
};
export default meta;

type Story = StoryObj<typeof FormSubmit>;

/**
 * The submit button reads `submitting` from the form level, so it shows the
 * pending state and blocks a second submit without the call site wiring it.
 */
export const Default: Story = { render: () => <DemoForm /> };

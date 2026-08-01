import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Form } from './form.component.js';
import { FormInput } from '../form-input/form-input.component.js';
import { FormChoice } from '../form-choice/form-choice.component.js';
import { FormErrorSummary } from '../form-error-summary/form-error-summary.component.js';
import type {
  UseFormErrors,
  UseFormField,
} from '../../form/form-adapter.types.js';

/** A hand-rolled binding, so the stories depend on no form library. */
function useDemoBinding() {
  const [values, setValues] = useState<Record<string, string | boolean>>({
    email: '',
    tos: false,
  });
  const [submitted, setSubmitted] = useState(false);
  const errors: Record<string, string[]> = {};
  if (submitted) {
    if (values.email === '') errors.email = ['Email is required.'];
    if (values.tos !== true) errors.tos = ['You have to accept.'];
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
  const formErrors: UseFormErrors = () => errors;
  return { field, formErrors, submit: () => setSubmitted(true) };
}

function Demo({ children }: { children: ReactNode }) {
  const { field, formErrors, submit } = useDemoBinding();
  return (
    <Form
      field={field}
      errors={formErrors}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      style={{
        display: 'grid',
        gap: 'var(--fm-space-stack-m)',
        maxWidth: '24rem',
      }}
    >
      {children}
    </Form>
  );
}

const meta: Meta<typeof Form> = {
  title: 'Components/Inputs/Form',
  component: Form,
  argTypes: {
    field: {
      control: false,
      description:
        'Usually omitted — give it once to `UiProvider` and every form below is wired. Pass it here only to override that.',
      table: { type: { summary: 'UseFormField' } },
    },
    errors: { control: false, table: { type: { summary: 'UseFormErrors' } } },
    noValidate: {
      control: 'boolean',
      description:
        'On by default. With the browser’s own validation left on, a required field blocks submission before your handler runs — measured, zero calls.',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'true' },
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Form>;

/** Submit it empty: the summary, the field messages and the button all react. */
export const Default: Story = {
  render: () => (
    <Demo>
      <FormErrorSummary
        labelFor={(n) => ({ email: 'Email', tos: 'Terms' })[n] ?? n}
      />
      <FormInput name="email" label="Email" hint="We’ll never share it." />
      <FormChoice name="tos" label="I accept the terms" />
      <button type="submit">Create account</button>
    </Demo>
  ),
};

import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormInput } from './form-input.component.js';
import { FormChoice } from '../form-choice/form-choice.component.js';
import { FormAdapterProvider } from '../../form/form-adapter-provider.component.js';
import { Button } from '../button/button.component.js';
import type { UseFormField } from '../../form/form-adapter.types.js';

/**
 * A hand-written adapter, so the stories stay free of any form library — which
 * is also the point being demonstrated: the components below name none.
 */
function DemoForm({ children }: { children: ReactNode }) {
  const [values, setValues] = useState<Record<string, string | boolean>>({
    email: '',
    password: '',
    tos: false,
  });
  const useDemoField: UseFormField = (name) => ({
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
    error:
      name === 'email' && values.email === ''
        ? 'Email is required.'
        : undefined,
  });
  return (
    <div
      style={{
        display: 'grid',
        gap: 'var(--fm-space-stack-m)',
        maxWidth: '22rem',
      }}
    >
      <FormAdapterProvider adapter={useDemoField}>
        {children}
      </FormAdapterProvider>
      <output style={{ font: 'var(--fm-font-mono, monospace)', opacity: 0.7 }}>
        {JSON.stringify(values)}
      </output>
    </div>
  );
}

const meta: Meta<typeof FormInput> = {
  title: 'Components/Inputs/FormInput',
  component: FormInput,
  argTypes: {
    name: {
      control: 'text',
      description: 'The field name, as your form library knows it.',
      table: { type: { summary: 'string' } },
    },
    label: { control: 'text', table: { type: { summary: 'ReactNode' } } },
    hint: { control: 'text', table: { type: { summary: 'ReactNode' } } },
  },
};
export default meta;

type Story = StoryObj<typeof FormInput>;

/** Bound to whatever adapter is in scope. Type into it and watch the value below. */
export const Default: Story = {
  args: { name: 'email', label: 'Email', hint: 'We’ll never share it.' },
  render: (args) => (
    <DemoForm>
      <FormInput {...args} />
    </DemoForm>
  ),
};

/** The error comes from the adapter, so there is no prop to forget. */
export const FromTheAdapter: Story = {
  render: () => (
    <DemoForm>
      <FormInput name="email" label="Email" />
      <FormChoice name="tos" label="Accept the terms" />
    </DemoForm>
  ),
};

/**
 * A whole signup form, the way an app would write it. Nothing below the
 * provider names a form library — swapping one is the single line that produces
 * `useDemoField`.
 */
export const CompleteForm: Story = {
  render: function CompleteFormStory() {
    return (
      <DemoForm>
        <FormInput name="email" label="Email" hint="We’ll never share it." />
        <FormInput name="password" label="Password" type="password" />
        <FormChoice name="tos" label="I accept the terms and conditions" />
        <Button type="submit">Create account</Button>
      </DemoForm>
    );
  },
};

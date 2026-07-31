import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormChoice } from './form-choice.component.js';
import { FormInput } from '../form-input/form-input.component.js';
import { FormAdapterProvider } from '../../form/form-adapter-provider.component.js';
import type { UseFormField } from '../../form/form-adapter.types.js';

/**
 * A hand-written adapter, so the stories stay free of any form library — which
 * is also the point being demonstrated: the components below name none.
 */
function DemoForm({ children }: { children: ReactNode }) {
  const [values, setValues] = useState<Record<string, string | boolean>>({
    email: '',
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

const meta: Meta<typeof FormChoice> = {
  title: 'Components/Inputs/FormChoice',
  component: FormChoice,
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

type Story = StoryObj<typeof FormChoice>;

/** A bound consent box — the control-first anatomy, already wired. */
export const Default: Story = {
  args: { name: 'tos', label: 'Accept the terms' },
  render: (args) => (
    <DemoForm>
      <FormChoice {...args} />
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

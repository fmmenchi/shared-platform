import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormTextarea } from './form-textarea.component.js';
import { FormInput } from '../form-input/form-input.component.js';
import { UiProvider } from '../../i18n/provider.js';
import type { UseFormField } from '../../form/form-adapter.types.js';

/**
 * A hand-written adapter, so the stories name no form library — which is also
 * the point being demonstrated.
 */
function DemoForm({ children }: { children: ReactNode }) {
  const [values, setValues] = useState<Record<string, string>>({
    title: '',
    notes: '',
  });
  const useDemoField: UseFormField = (name) => ({
    control: {
      name,
      onChange: (event) =>
        setValues((v) => ({ ...v, [name]: event.target.value })),
    },
    errors:
      name === 'notes' && values.notes.length > 0 && values.notes.length < 10
        ? ['Tell us a little more — at least 10 characters.']
        : [],
  });

  return (
    <div
      style={{
        display: 'grid',
        gap: 'var(--fm-space-stack-m)',
        maxWidth: '22rem',
      }}
    >
      <UiProvider
        adapters={{ i18n: { locale: 'en' }, form: { field: useDemoField } }}
      >
        {children}
      </UiProvider>
    </div>
  );
}

const meta: Meta<typeof FormTextarea> = {
  title: 'Components/Form adapters/FormTextarea',
  component: FormTextarea,
  args: { name: 'notes', label: 'Notes', rows: 4 },
  argTypes: {
    name: {
      control: 'text',
      description: 'The field name, as your form library knows it.',
      table: { type: { summary: 'string' } },
    },
    label: { control: 'text', table: { type: { summary: 'ReactNode' } } },
    hint: {
      control: 'text',
      description: 'Rendered before the messages, in DOM order.',
      table: { type: { summary: 'ReactNode' } },
    },
    rows: {
      control: { type: 'number', min: 1, max: 20 },
      description: 'The height, in lines — the native attribute.',
      table: { type: { summary: 'number' } },
    },
  },
  decorators: [
    (Story) => (
      <DemoForm>
        <Story />
      </DemoForm>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof FormTextarea>;

/** One tag per field: the label, the control and its messages, already bound. */
export const Default: Story = {};

/** A hint sits before the messages, whatever their number. */
export const WithHint: Story = {
  args: {
    hint: 'Markdown is fine. Type fewer than 10 characters to see the error.',
  },
};

/** It sits beside `FormInput` in the same form, and shares its rhythm. */
export const InAForm: Story = {
  render: () => (
    <>
      <FormInput name="title" label="Title" />
      <FormTextarea
        name="notes"
        label="Notes"
        rows={4}
        hint="At least 10 characters."
      />
    </>
  ),
};

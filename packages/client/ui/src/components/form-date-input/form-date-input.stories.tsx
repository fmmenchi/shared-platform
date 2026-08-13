import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormDateInput } from './form-date-input.component.js';
import { UiProvider } from '../../i18n/provider.js';
import type { UseFormField } from '../../form/form-adapter.types.js';

/**
 * A hand-written adapter, so the stories name no form library — which is also
 * the point: neither does the component.
 *
 * Note what it reads: `event.target.value`, straight off the carrier. There is
 * no delegation here and no group-shaped special case, because the field really
 * does have one input holding one value.
 */
function DemoForm({ children }: { children: ReactNode }) {
  const [values, setValues] = useState<Record<string, string>>({
    dob: '',
    start: '',
  });
  const useDemoField: UseFormField = (name) => ({
    control: {
      name,
      onChange: (event) => {
        const el = event.target as HTMLInputElement;
        setValues((v) => ({ ...v, [name]: el.value }));
      },
    },
    errors:
      name === 'start' && values.start === ''
        ? ['Enter the day you start.']
        : [],
  });
  return (
    <div
      style={{
        display: 'grid',
        gap: 'var(--fm-space-stack-m)',
        maxWidth: '26rem',
      }}
    >
      <UiProvider
        adapters={{ i18n: { locale: 'en' }, form: { field: useDemoField } }}
      >
        {children}
      </UiProvider>
      <output style={{ font: 'var(--fm-font-mono, monospace)', opacity: 0.7 }}>
        {JSON.stringify(values)}
      </output>
    </div>
  );
}

const meta = {
  title: 'Components/Form adapters/FormDateInput',
  component: FormDateInput,
  parameters: {
    docs: {
      description: {
        component:
          'A bound `DateInput`: the legend, the parts, the hint and the errors in one tag. The group is named once, by the legend.',
      },
    },
  },
} satisfies Meta<typeof FormDateInput>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One tag per field, and nothing names a form library. */
export const Default: Story = {
  args: { name: 'dob', label: 'Date of birth' },
  render: (args) => (
    <DemoForm>
      <FormDateInput {...args} />
    </DemoForm>
  ),
};

/** The hint sits before the errors, however many of them there are. */
export const WithHintAndError: Story = {
  args: {
    name: 'start',
    label: 'Start date',
    hint: 'The first day you will be working.',
  },
  render: (args) => (
    <DemoForm>
      <FormDateInput {...args} />
    </DemoForm>
  ),
};

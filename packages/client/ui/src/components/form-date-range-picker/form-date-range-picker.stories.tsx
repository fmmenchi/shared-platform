import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormDateRangePicker } from './form-date-range-picker.component.js';
import { UiProvider } from '../../i18n/provider.js';
import type { UseFormField } from '../../form/form-adapter.types.js';

/**
 * A hand-written adapter, so the stories name no form library — which is also
 * the point: neither does the component. Note that it is asked for TWO names
 * and answers each for itself, which is the whole of what binding two fields
 * takes.
 */
function DemoForm({ children }: { children: ReactNode }) {
  const [values, setValues] = useState<Record<string, string>>({
    checkIn: '',
    checkOut: '',
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
      name === 'checkOut' && values.checkOut === ''
        ? ['Scegli quando riparti.']
        : [],
  });
  return (
    <div
      style={{
        display: 'grid',
        gap: 'var(--fm-space-stack-m)',
        maxWidth: '28rem',
      }}
    >
      <UiProvider
        adapters={{ i18n: { locale: 'it' }, form: { field: useDemoField } }}
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
  title: 'Components/Form adapters/FormDateRangePicker',
  component: FormDateRangePicker,
  parameters: {
    docs: {
      description: {
        component:
          'A bound date range: two names, two entries, one calendar — and the first component here that binds two fields.',
      },
    },
  },
} satisfies Meta<typeof FormDateRangePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

const base = {
  startName: 'checkIn',
  endName: 'checkOut',
  startLabel: 'Arrivo',
  endLabel: 'Partenza',
  legend: 'Il tuo soggiorno',
  defaultMonth: { year: 2026, month: 8, day: 1 },
} as const;

/**
 * One tag, two bound fields. Pick a stay from the calendar and watch the value
 * below: the adapter reads `event.target.value` and knows nothing about a grid.
 */
export const Default: Story = {
  args: { ...base },
  render: (args) => (
    <DemoForm>
      <FormDateRangePicker {...args} />
    </DemoForm>
  ),
};

/** The hint sits before the errors, and the errors of BOTH ends are shown. */
export const WithHintAndError: Story = {
  args: { ...base, hint: 'Quando arrivi e quando riparti.' },
  render: (args) => (
    <DemoForm>
      <FormDateRangePicker {...args} />
    </DemoForm>
  ),
};

/** Neither field is typed into: both are the calendar's trigger. */
export const PickOnly: Story = {
  args: { ...base, pickOnly: true },
  render: (args) => (
    <DemoForm>
      <FormDateRangePicker {...args} />
    </DemoForm>
  ),
};

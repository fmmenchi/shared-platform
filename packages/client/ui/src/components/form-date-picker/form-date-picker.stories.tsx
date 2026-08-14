import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormDatePicker } from './form-date-picker.component.js';
import { UiProvider } from '../../i18n/provider.js';
import type { UseFormField } from '../../form/form-adapter.types.js';

/**
 * A hand-written adapter, so the stories name no form library — which is also
 * the point: neither does the component.
 *
 * Note what it reads: `event.target.value`, straight off the carrier, whether
 * the date was typed or chosen from the grid. Nothing here knows a calendar is
 * involved, and that is the whole claim.
 */
function DemoForm({ children }: { children: ReactNode }) {
  const [values, setValues] = useState<Record<string, string>>({
    departure: '',
    appointment: '',
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
      name === 'appointment' && values.appointment === ''
        ? ['Scegli un giorno.']
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
  title: 'Components/Form adapters/FormDatePicker',
  component: FormDatePicker,
  parameters: {
    docs: {
      description: {
        component:
          'A bound `DatePicker`: the label, the field, the calendar, the hint and the errors in one tag — and no library-specific code to make the calendar reach the form.',
      },
    },
  },
} satisfies Meta<typeof FormDatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * One tag per field, and nothing names a form library — not even to get the
 * calendar's choice into the form. Type a date or pick one: the value below
 * updates the same way either time, through an ordinary change event.
 */
export const Default: Story = {
  args: { name: 'departure', label: 'Data di partenza' },
  render: (args) => (
    <DemoForm>
      <FormDatePicker {...args} />
    </DemoForm>
  ),
};

/** The hint sits before the errors, however many of them there are. */
export const WithHintAndError: Story = {
  args: {
    name: 'appointment',
    label: 'Appuntamento',
    hint: 'Scegli il giorno che preferisci.',
  },
  render: (args) => (
    <DemoForm>
      <FormDatePicker {...args} />
    </DemoForm>
  ),
};

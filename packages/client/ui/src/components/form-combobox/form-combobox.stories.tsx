import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormCombobox } from './form-combobox.component.js';
import { UiProvider } from '../../i18n/provider.js';
import type { UseFormField } from '../../form/form-adapter.types.js';

interface City {
  id: string;
  name: string;
}

const CITIES: City[] = [
  { id: '1', name: 'Milano' },
  { id: '2', name: 'Málaga' },
  { id: '3', name: 'Manchester' },
  { id: '4', name: 'Torino' },
];

/**
 * A hand-written adapter, so the stories name no form library — which is also
 * the point being demonstrated: the component below names none either.
 */
function DemoForm({ children }: { children: ReactNode }) {
  const [values, setValues] = useState<Record<string, string>>({ city: '' });
  const useDemoField: UseFormField = (name) => ({
    control: {
      name,
      onChange: (event) => {
        const el = event.target as HTMLInputElement;
        setValues((v) => ({ ...v, [name]: el.value }));
      },
    },
    errors: name === 'city' && values.city === '' ? ['Pick a city.'] : [],
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
      <output style={{ opacity: 0.7 }}>{JSON.stringify(values)}</output>
    </div>
  );
}

const meta: Meta<typeof FormCombobox<City>> = {
  title: 'Components/Form adapters/FormCombobox',
  component: FormCombobox,
  args: {
    name: 'city',
    label: 'City',
    items: CITIES,
    getKey: (city: City) => city.id,
    getLabel: (city: City) => city.name,
  },
  argTypes: {
    multiple: {
      control: 'boolean',
      description:
        'Several of many — bound through the OPTION port rather than the per-field one, since only that port can say a whole list. The starting selection comes from the binding.',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    name: {
      description:
        'The field name the binding is looked up by, and what the form submits.',
      table: { type: { summary: 'string' } },
    },
    label: {
      description: 'Rendered by `Field` and associated with the control.',
      table: { type: { summary: 'ReactNode' } },
    },
    hint: {
      description: 'Help text under the control, before any error.',
      table: { type: { summary: 'ReactNode' } },
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

type Story = StoryObj<typeof FormCombobox<City>>;

/** Bound, labelled, and reporting to the binding on every pick. */
export const Default: Story = {};

/** With a hint, and the error the demo adapter reports until something is chosen. */
export const WithHint: Story = {
  args: { hint: 'Where the order ships.' },
};

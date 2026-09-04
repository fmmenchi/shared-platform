import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormCombobox } from './form-combobox.component.js';
import { UiProvider } from '../../i18n/provider.js';
import type {
  UseFormField,
  UseFormOptionField,
} from '../../form/form-adapter.types.js';

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
  const [sets, setSets] = useState<Record<string, readonly string[]>>({});
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
  /**
   * THE OTHER PORT, because `multiple` binds through it — and this stub not
   * existing was a defect rather than an omission: with only `field` in the
   * adapter, flipping the `multiple` control threw, since `useBoundOptionField`
   * refuses to fall back to a per-field binding a set cannot use.
   */
  const useDemoOptionField: UseFormOptionField = (name) => ({
    option: (value) => ({
      name,
      value,
      checked: (sets[name] ?? []).includes(value),
      onChange: () => undefined,
    }),
    setValues: (next) => setSets((all) => ({ ...all, [name]: next })),
    errors: [],
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
        adapters={{
          i18n: { locale: 'en' },
          form: { field: useDemoField, optionField: useDemoOptionField },
        }}
      >
        {children}
      </UiProvider>
      <output style={{ opacity: 0.7 }}>
        {JSON.stringify({ ...values, ...sets })}
      </output>
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

/**
 * SEVERAL OF MANY, bound through the option port — the only one that can hold a
 * set. What the demo adapter stores is printed below the field, so a removal
 * can be seen leaving the form's own value rather than only the screen.
 */
export const Multiple: Story = {
  args: { multiple: true, name: 'cities', label: 'Cities' },
};

/** With a hint, and the error the demo adapter reports until something is chosen. */
export const WithHint: Story = {
  args: { hint: 'Where the order ships.' },
};

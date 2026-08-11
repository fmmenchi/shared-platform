import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormSelect } from './form-select.component.js';
import { FormInput } from '../form-input/form-input.component.js';
import { UiProvider } from '../../i18n/provider.js';
import type { UseFormField } from '../../form/form-adapter.types.js';

/** A hand-written adapter, so the stories name no form library. */
function DemoForm({ children }: { children: ReactNode }) {
  const [values, setValues] = useState<Record<string, string>>({
    city: '',
    country: '',
  });
  const useDemoField: UseFormField = (name) => ({
    control: {
      name,
      onChange: (event) =>
        setValues((v) => ({ ...v, [name]: event.target.value })),
    },
    errors:
      name === 'country' && values.country === ''
        ? ['Pick a country to continue.']
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

const countries = (
  <>
    <option value="">Choose…</option>
    <option value="it">Italy</option>
    <option value="fr">France</option>
    <option value="es">Spain</option>
  </>
);

const meta: Meta<typeof FormSelect> = {
  title: 'Components/Form adapters/FormSelect',
  component: FormSelect,
  args: { name: 'country', label: 'Country', children: countries },
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
    children: {
      control: false,
      description: 'The options — yours, because they are content.',
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

type Story = StoryObj<typeof FormSelect>;

/** One tag per field: label, control, options and messages, already bound. */
export const Default: Story = {};

/** The hint sits before the message — pick a country to clear the error. */
export const WithHint: Story = {
  args: { hint: 'Where you pay your taxes.' },
};

/** Beside a `FormInput`, on the same row and the same height. */
export const InAForm: Story = {
  render: () => (
    <>
      <FormInput name="city" label="City" placeholder="Rome" />
      <FormSelect name="country" label="Country">
        {countries}
      </FormSelect>
    </>
  ),
};

import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormSegmentedControl } from './form-segmented-control.component.js';
import { SegmentedControlItem } from '../segmented-control-item/segmented-control-item.component.js';
import { UiProvider } from '../../i18n/provider.js';
import type { UseFormField } from '../../form/form-adapter.types.js';

/**
 * A hand-written adapter, so the stories stay free of any form library — which
 * is also the point being demonstrated: the components below name none.
 *
 * Note what it reads: `event.target.value`. The change arrives by DELEGATION
 * from whichever radio the user picked, because a group has no single input for
 * the binding's `onChange` to sit on.
 */
function DemoForm({ children }: { children: ReactNode }) {
  const [values, setValues] = useState<Record<string, string>>({
    align: 'left',
    range: '',
  });
  const useDemoField: UseFormField = (name) => ({
    control: {
      name,
      onChange: (event) => {
        const el = event.target as HTMLInputElement;
        setValues((v) => ({ ...v, [name]: el.value }));
      },
    },
    errors: name === 'range' && values.range === '' ? ['Pick a range.'] : [],
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

const meta: Meta<typeof FormSegmentedControl> = {
  title: 'Components/Inputs/FormSegmentedControl',
  component: FormSegmentedControl,
  argTypes: {
    name: {
      control: 'text',
      description: 'The field name, as your form library knows it.',
      table: { type: { summary: 'string' } },
    },
    label: {
      control: 'text',
      description:
        'The visible group label, rendered as the fieldset’s legend — and the only name the set has.',
      table: { type: { summary: 'ReactNode' } },
    },
    hint: { control: 'text', table: { type: { summary: 'ReactNode' } } },
  },
};
export default meta;

type Story = StoryObj<typeof FormSegmentedControl>;

/** A bound set — the legend names it, the options submit under `name`. */
export const Default: Story = {
  args: { name: 'align', label: 'Text alignment' },
  render: (args) => (
    <DemoForm>
      <FormSegmentedControl {...args}>
        <SegmentedControlItem value="left">Left</SegmentedControlItem>
        <SegmentedControlItem value="center">Center</SegmentedControlItem>
        <SegmentedControlItem value="right">Right</SegmentedControlItem>
      </FormSegmentedControl>
    </DemoForm>
  ),
};

/** The error comes from the adapter, so there is no prop to forget. */
export const FromTheAdapter: Story = {
  render: () => (
    <DemoForm>
      <FormSegmentedControl
        name="range"
        label="Date range"
        hint="How far back the report goes."
      >
        <SegmentedControlItem value="24h">24 hours</SegmentedControlItem>
        <SegmentedControlItem value="7d">7 days</SegmentedControlItem>
        <SegmentedControlItem value="30d">30 days</SegmentedControlItem>
      </FormSegmentedControl>
    </DemoForm>
  ),
};

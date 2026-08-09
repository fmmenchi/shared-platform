import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormSwitch } from './form-switch.component.js';
import { UiProvider } from '../../i18n/provider.js';
import type { UseFormField } from '../../form/form-adapter.types.js';

/**
 * A hand-written adapter, so the stories stay free of any form library — which
 * is also the point being demonstrated: the components below name none.
 *
 * It PERSISTS ON CHANGE, because that is what a bound switch is for: the
 * library holds the state and the setting applies as it is flipped. A switch
 * parked in a form that submits later is a checkbox in the wrong clothes
 * (ADR-0024).
 */
function DemoSettings({ children }: { children: ReactNode }) {
  const [values, setValues] = useState<Record<string, boolean>>({
    notify: true,
    digest: false,
  });
  const [saved, setSaved] = useState(0);
  const useDemoField: UseFormField = (name) => ({
    control: {
      name,
      onChange: (event) => {
        const el = event.target as HTMLInputElement;
        setValues((v) => ({ ...v, [name]: el.checked }));
        setSaved((n) => n + 1);
      },
    },
    errors:
      name === 'digest' && values.digest && !values.notify
        ? ['A weekly digest needs notifications on.']
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
      <output style={{ font: 'var(--fm-font-mono, monospace)', opacity: 0.7 }}>
        {JSON.stringify(values)} — saved {saved}×
      </output>
    </div>
  );
}

const meta: Meta<typeof FormSwitch> = {
  title: 'Components/Inputs/FormSwitch',
  component: FormSwitch,
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

type Story = StoryObj<typeof FormSwitch>;

/** A bound setting — already wired, and saved as it is flipped. */
export const Default: Story = {
  args: { name: 'notify', label: 'Email me about replies' },
  render: (args) => (
    <DemoSettings>
      <FormSwitch {...args} />
    </DemoSettings>
  ),
};

/** A settings surface: several bound switches, each saving on change. */
export const Settings: Story = {
  render: () => (
    <DemoSettings>
      <FormSwitch name="notify" label="Email me about replies" />
      <FormSwitch
        name="digest"
        label="Weekly digest"
        hint="A summary every Monday."
      />
    </DemoSettings>
  ),
};

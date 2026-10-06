import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormTimeInput } from './form-time-input.component.js';
import { UiProvider } from '../../i18n/provider.js';
import type { UseFormField } from '../../form/form-adapter.types.js';

/**
 * A hand-written adapter, so the stories name no form library — which is also
 * the point: neither does the component.
 *
 * Note what it reads: `event.target.value`, straight off the carrier. That is
 * `HH:mm` on every keystroke, whatever the box is showing.
 */
function DemoForm({ children }: { children: ReactNode }) {
  const [values, setValues] = useState<Record<string, string>>({
    opens: '',
    closes: '',
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
      name === 'closes' && values.closes === ''
        ? ['Enter the time you close.']
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
      <UiProvider adapters={{ form: { field: useDemoField } }}>
        {children}
      </UiProvider>
      <output style={{ font: 'var(--fm-type-body-s)' }}>
        {JSON.stringify(values)}
      </output>
    </div>
  );
}

const meta = {
  title: 'Components/Form adapters/FormTimeInput',
  component: FormTimeInput,
  parameters: {
    docs: {
      description: {
        component:
          'A labelled time field already bound to the form library in scope. The binding sees `HH:mm`; the user sees their locale’s hour cycle.',
      },
    },
  },
} satisfies Meta<typeof FormTimeInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { name: 'opens', label: 'Opens at', hint: 'When the doors open' },
  render: (args) => (
    <DemoForm>
      <FormTimeInput {...args} />
    </DemoForm>
  ),
};

/**
 * WHAT THE BINDING SEES, beside what the reader sees, on an `en-US` page.
 *
 * Type `0230` then `p`. The box says `02:30 PM`; the value under it — the one
 * printed below, and the one a schema validates — says `14:30`. They are never
 * the same string here, which is the whole reason the carrier exists.
 */
export const WhatTheBindingSees: Story = {
  args: { name: 'opens', label: 'Opens at', hint: 'Try 0230, then p' },
  render: (args) => (
    <UiProvider adapters={{ i18n: { locale: 'en-US' } }}>
      <DemoForm>
        <FormTimeInput {...args} />
      </DemoForm>
    </UiProvider>
  ),
};

/** Errors: one statement per message, with the hint keeping its place first. */
export const WithErrors: Story = {
  args: {
    name: 'closes',
    label: 'Closes at',
    hint: 'Must be after opening time',
  },
  render: (args) => (
    <DemoForm>
      <FormTimeInput {...args} />
    </DemoForm>
  ),
};

/**
 * The pair, as a page would actually use it — and the same value under two
 * locales, so the disagreement this component removes is visible in one screen.
 */
export const AcrossLocales: Story = {
  args: { name: 'opens', label: 'Opens at' },
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--fm-space-stack-l)' }}>
      {['en-US', 'it'].map((locale) => (
        <UiProvider key={locale} adapters={{ i18n: { locale } }}>
          <DemoForm>
            <FormTimeInput name="opens" label={`Opens at — ${locale}`} />
            <FormTimeInput name="closes" label={`Closes at — ${locale}`} />
          </DemoForm>
        </UiProvider>
      ))}
    </div>
  ),
};

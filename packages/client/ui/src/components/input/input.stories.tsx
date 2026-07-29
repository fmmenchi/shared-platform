import type { ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from './input.component.js';

const meta: Meta<typeof Input> = {
  title: 'Components/Input',
  component: Input,
  args: { placeholder: 'you@example.com', size: 'md' },
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
      description:
        'Height, matching Button (sm 32 · md 36 · lg 44) so controls and buttons align.',
      table: {
        type: { summary: "'sm' | 'md' | 'lg'" },
        defaultValue: { summary: "'md'" },
      },
    },
    'aria-invalid': {
      control: 'boolean',
      description:
        'The native attribute your form library sets — drives the error styling.',
      table: { type: { summary: 'boolean' } },
    },
    disabled: { control: 'boolean', table: { type: { summary: 'boolean' } } },
  },
};
export default meta;

type Story = StoryObj<typeof Input>;

const Field = ({
  label,
  ...props
}: { label: string } & ComponentProps<typeof Input>) => (
  <label style={{ display: 'grid', gap: 'var(--fm-space-internal-xs)' }}>
    {label}
    <Input {...props} />
  </label>
);

/** The default control surface (drives the Props table). Always give it a label. */
export const Default: Story = {
  render: (args) => <Field label="Email" {...args} />,
};

/** sm · md · lg — the same heights as Button. */
export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--fm-space-stack-s)' }}>
      <Field label="Small" size="sm" placeholder="sm" />
      <Field label="Medium" size="md" placeholder="md" />
      <Field label="Large" size="lg" placeholder="lg" />
    </div>
  ),
};

/** States: default, invalid (via `aria-invalid`), disabled. */
export const States: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--fm-space-stack-s)' }}>
      <Field label="Default" placeholder="Type here" />
      <Field label="Invalid" aria-invalid placeholder="Bad value" />
      <Field label="Disabled" disabled placeholder="Can’t type" />
    </div>
  ),
};

/** Native input types work — it's a transparent `<input>`. */
export const Types: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--fm-space-stack-s)' }}>
      <Field label="Email" type="email" placeholder="you@example.com" />
      <Field label="Password" type="password" placeholder="••••••••" />
      <Field label="Amount" type="number" inputMode="numeric" placeholder="0" />
      <Field label="Date" type="date" />
    </div>
  ),
};

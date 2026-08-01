import type { ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Select } from './select.component.js';
import { Input } from '../input/input.component.js';

const countries = (
  <>
    <option value="">Choose…</option>
    <option value="it">Italy</option>
    <option value="fr">France</option>
    <option value="es">Spain</option>
  </>
);

const meta: Meta<typeof Select> = {
  title: 'Components/Inputs/Select',
  component: Select,
  args: { size: 'md', children: countries },
  // The Props table is CURATED here (react-docgen can't derive it) — declare
  // every public prop with type summary, default and description.
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
      description:
        'Height, matching Input and Button (sm 32 · md 36 · lg 44). It shadows the native `size` attribute, which is a row count.',
      table: {
        type: { summary: "'sm' | 'md' | 'lg'" },
        defaultValue: { summary: "'md'" },
      },
    },
    children: {
      control: false,
      description:
        'The options — `<option>` and `<optgroup>`, as HTML writes them.',
      table: { type: { summary: 'ReactNode' } },
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

type Story = StoryObj<typeof Select>;

const Field = ({
  label,
  ...props
}: { label: string } & ComponentProps<typeof Select>) => (
  <label style={{ display: 'grid', gap: 'var(--fm-space-internal-xs)' }}>
    {label}
    <Select {...props} />
  </label>
);

/** The default control surface (drives the Props table). Always give it a label. */
export const Default: Story = {
  render: (args) => <Field label="Country" {...args} />,
};

/** sm · md · lg — the same heights as Input and Button. */
export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--fm-space-stack-s)' }}>
      <Field label="Small" size="sm">
        {countries}
      </Field>
      <Field label="Medium" size="md">
        {countries}
      </Field>
      <Field label="Large" size="lg">
        {countries}
      </Field>
    </div>
  ),
};

/** States: default, invalid (via `aria-invalid`), disabled. */
export const States: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--fm-space-stack-s)' }}>
      <Field label="Default">{countries}</Field>
      <Field label="Invalid" aria-invalid>
        {countries}
      </Field>
      <Field label="Disabled" disabled>
        {countries}
      </Field>
    </div>
  ),
};

/** `<optgroup>` works, because the options are just HTML. */
export const Groups: Story = {
  render: () => (
    <Field label="Country">
      <option value="">Choose…</option>
      <optgroup label="Europe">
        <option value="it">Italy</option>
        <option value="fr">France</option>
      </optgroup>
      <optgroup label="Americas">
        <option value="br">Brazil</option>
        <option value="ca">Canada</option>
      </optgroup>
    </Field>
  ),
};

/** Beside an Input: same height, same rhythm, same row. */
export const WithAnInput: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 'var(--fm-space-inline-s)',
        alignItems: 'end',
      }}
    >
      <label style={{ display: 'grid', gap: 'var(--fm-space-internal-xs)' }}>
        City
        <Input placeholder="Rome" />
      </label>
      <Field label="Country">{countries}</Field>
    </div>
  ),
};

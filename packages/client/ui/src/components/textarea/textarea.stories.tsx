import type { ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Textarea } from './textarea.component.js';

const meta: Meta<typeof Textarea> = {
  title: 'Components/Inputs/Textarea',
  component: Textarea,
  args: { placeholder: 'Tell us more…', size: 'md', rows: 3 },
  // The Props table is CURATED here (react-docgen can't derive it) — declare
  // every public prop with type summary, default and description.
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
      description:
        'Type scale and vertical padding — NOT a height. The height is `rows`.',
      table: {
        type: { summary: "'sm' | 'md' | 'lg'" },
        defaultValue: { summary: "'md'" },
      },
    },
    resize: {
      control: 'inline-radio',
      options: ['vertical', 'none'],
      description:
        "The browser's own default is `both`, which lets a drag make the field wider than the form around it.",
      table: {
        type: { summary: "'vertical' | 'none'" },
        defaultValue: { summary: "'vertical'" },
      },
    },
    rows: {
      control: { type: 'number', min: 1, max: 20 },
      description: 'The height, in lines — the native attribute.',
      table: { type: { summary: 'number' } },
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

type Story = StoryObj<typeof Textarea>;

const Field = ({
  label,
  ...props
}: { label: string } & ComponentProps<typeof Textarea>) => (
  <label style={{ display: 'grid', gap: 'var(--fm-space-internal-xs)' }}>
    {label}
    <Textarea {...props} />
  </label>
);

/** The default control surface (drives the Props table). Always give it a label. */
export const Default: Story = {
  render: (args) => <Field label="Notes" {...args} />,
};

/** sm · md · lg — type scale and padding. The height stays `rows`. */
export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--fm-space-stack-s)' }}>
      <Field label="Small" size="sm" rows={2} placeholder="sm" />
      <Field label="Medium" size="md" rows={2} placeholder="md" />
      <Field label="Large" size="lg" rows={2} placeholder="lg" />
    </div>
  ),
};

/** States: default, invalid (via `aria-invalid`), disabled, read-only. */
export const States: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--fm-space-stack-s)' }}>
      <Field label="Default" placeholder="Type here" />
      <Field label="Invalid" aria-invalid placeholder="Too short" />
      <Field label="Disabled" disabled placeholder="Can’t type" />
      <Field label="Read-only" readOnly defaultValue="Already said." />
    </div>
  ),
};

/**
 * `rows` sets the height and `resize` says whether the user may change it.
 * Dragging is vertical-only by default: the browser's `both` lets a field grow
 * wider than the form that contains it, which no layout survives.
 */
export const Resize: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--fm-space-stack-s)' }}>
      <Field
        label="Vertical (default)"
        rows={2}
        placeholder="Drag the corner"
      />
      <Field label="Fixed" resize="none" rows={2} placeholder="No handle" />
      <Field label="Taller" rows={6} placeholder="rows={6}" />
    </div>
  ),
};

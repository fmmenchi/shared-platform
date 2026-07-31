import type { Meta, StoryObj } from '@storybook/react-vite';
import { Field } from './field.component.js';
import { FieldLabel } from '../field-label/field-label.component.js';
import { FieldDescription } from '../field-description/field-description.component.js';
import { FieldError } from '../field-error/field-error.component.js';
import { Input } from '../input/input.component.js';
import { Badge } from '../badge/badge.component.js';

const meta: Meta<typeof Field> = {
  title: 'Components/Inputs/Field',
  component: Field,
  argTypes: {
    label: {
      control: 'text',
      description:
        'Shorthand for a FieldLabel before the control. Compose the part instead when the label needs markup of its own.',
      table: { type: { summary: 'ReactNode' } },
    },
    hint: {
      control: 'text',
      description:
        'Shorthand for a FieldDescription after the control — announced with the field.',
      table: { type: { summary: 'ReactNode' } },
    },
    error: {
      control: 'text',
      description:
        'Shorthand for a FieldError. Content here also turns `invalid` on; empty content renders nothing.',
      table: { type: { summary: 'ReactNode' } },
    },
    invalid: {
      control: 'boolean',
      description:
        'Error state — sets the control’s aria-invalid. Defaults to whether `error` has content, so the two cannot drift apart.',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'error is non-empty' },
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Field>;

const box = { maxWidth: '20rem' };

/** The ordinary field: label, control, hint — two tags. */
export const Default: Story = {
  args: { label: 'Email', hint: 'We’ll never share it.' },
  render: (args) => (
    <Field {...args} style={box}>
      <Input type="email" placeholder="you@example.com" />
    </Field>
  ),
};

/**
 * In error. Passing `error` is enough — it reveals the message AND sets
 * `aria-invalid`, so the visible state and the announced one cannot disagree.
 */
export const Invalid: Story = {
  args: { label: 'Email', error: 'Enter a valid email address.' },
  render: (args) => (
    <Field {...args} style={box}>
      <Input type="email" defaultValue="not-an-email" />
    </Field>
  ),
};

/**
 * The idiomatic call passes the error unconditionally: with nothing to report
 * it is `undefined`, which renders nothing and leaves the field valid.
 */
export const NoErrorYet: Story = {
  render: () => (
    <Field
      label="Email"
      error={undefined}
      hint="Nothing to report."
      style={box}
    >
      <Input type="email" />
    </Field>
  ),
};

/**
 * Composing the parts by hand does exactly the same wiring, and is the way in
 * when a part needs more than a string — here a label carrying a badge. Mix
 * freely; just don't give one field two labels.
 */
export const Composed: Story = {
  render: () => (
    <Field style={box}>
      <FieldLabel>
        Email <Badge>new</Badge>
      </FieldLabel>
      <Input type="email" placeholder="you@example.com" />
      <FieldDescription>Used to sign in.</FieldDescription>
      <FieldError>Enter a valid email address.</FieldError>
    </Field>
  ),
};

/** Several fields — what a form looks like in practice. */
export const Form: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--fm-space-stack-m)', ...box }}>
      <Field label="Name">
        <Input autoComplete="name" />
      </Field>
      <Field label="Email" hint="We’ll never share it.">
        <Input type="email" autoComplete="email" />
      </Field>
      <Field label="Password" error="At least 8 characters.">
        <Input type="password" autoComplete="new-password" />
      </Field>
    </div>
  ),
};

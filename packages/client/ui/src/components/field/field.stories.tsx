import type { Meta, StoryObj } from '@storybook/react-vite';
import { Field } from './field.component.js';
import { FieldLabel } from '../field-label/field-label.component.js';
import { FieldDescription } from '../field-description/field-description.component.js';
import { FieldError } from '../field-error/field-error.component.js';
import { Input } from '../input/input.component.js';

const meta: Meta<typeof Field> = {
  title: 'Components/Field',
  component: Field,
  argTypes: {
    invalid: {
      control: 'boolean',
      description:
        'Error state — sets the control’s aria-invalid and reveals the error. Your validation library owns when it’s true.',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Field>;

/** Label + control + description, wired for accessibility. */
export const Default: Story = {
  render: (args) => (
    <Field {...args} style={{ maxWidth: '20rem' }}>
      <FieldLabel>Email</FieldLabel>
      <Input type="email" placeholder="you@example.com" />
      <FieldDescription>We’ll never share it.</FieldDescription>
    </Field>
  ),
};

/** In error: `invalid` flips the control and reveals the message. */
export const Invalid: Story = {
  args: { invalid: true },
  render: (args) => (
    <Field {...args} style={{ maxWidth: '20rem' }}>
      <FieldLabel>Email</FieldLabel>
      <Input type="email" defaultValue="not-an-email" />
      <FieldError>Enter a valid email address.</FieldError>
    </Field>
  ),
};

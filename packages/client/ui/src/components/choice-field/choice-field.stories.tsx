import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChoiceField } from './choice-field.component.js';
import { Checkbox } from '../checkbox/checkbox.component.js';
import { Radio } from '../radio/radio.component.js';

const meta: Meta<typeof ChoiceField> = {
  title: 'Components/Inputs/ChoiceField',
  component: ChoiceField,
  args: { label: 'Accept the terms and conditions' },
  argTypes: {
    label: {
      control: 'text',
      description:
        'The words beside the control. Required — a choice with nothing next to it is not a field.',
      table: { type: { summary: 'ReactNode' } },
    },
    hint: {
      control: 'text',
      description:
        'Helper text under the label. Rarely needed: the label of a single choice usually says everything.',
      table: { type: { summary: 'ReactNode' } },
    },
    error: {
      control: 'text',
      description:
        'The message under the label. Content here also turns `invalid` on; empty content renders nothing.',
      table: { type: { summary: 'ReactNode' } },
    },
  },
};
export default meta;

type Story = StoryObj<typeof ChoiceField>;

const box = { maxWidth: '22rem' };

/** A consent checkbox — the case this component exists for. */
export const Default: Story = {
  render: (args) => (
    <ChoiceField {...args} style={box}>
      <Checkbox />
    </ChoiceField>
  ),
};

/** In error. The message lines up under the label, not under the box. */
export const Invalid: Story = {
  args: { error: 'You have to accept to continue.' },
  render: (args) => (
    <ChoiceField {...args} style={box}>
      <Checkbox />
    </ChoiceField>
  ),
};

/** With a hint — for when ticking the box has a consequence the label doesn't say. */
export const WithHint: Story = {
  args: {
    label: 'Send me product updates',
    hint: 'About one email a month. You can unsubscribe at any time.',
  },
  render: (args) => (
    <ChoiceField {...args} style={box}>
      <Checkbox />
    </ChoiceField>
  ),
};

/** A lone radio works the same — one choice, one field. */
export const WithRadio: Story = {
  args: { label: 'Standard delivery, 3–5 working days' },
  render: (args) => (
    <ChoiceField {...args} style={box}>
      <Radio name="shipping" defaultChecked />
    </ChoiceField>
  ),
};

/**
 * A long label wraps in its own column, and the control stays put — it does not
 * shrink and does not drift down the block.
 */
export const LongLabel: Story = {
  args: {
    label:
      'I agree to the processing of my personal data for the purposes described in the privacy policy',
    error: 'Required.',
  },
  render: (args) => (
    <ChoiceField {...args} style={{ maxWidth: '16rem' }}>
      <Checkbox />
    </ChoiceField>
  ),
};

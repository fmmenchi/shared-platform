import type { ComponentProps, CSSProperties, ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Radio } from './radio.component.js';
import { Fieldset } from '../fieldset/fieldset.component.js';
import { FieldsetLegend } from '../fieldset-legend/fieldset-legend.component.js';
import { FieldsetContent } from '../fieldset-content/fieldset-content.component.js';
import { FieldDescription } from '../field-description/field-description.component.js';
import { FieldError } from '../field-error/field-error.component.js';

const meta: Meta<typeof Radio> = {
  title: 'Components/Inputs/Radio',
  component: Radio,
  args: { name: 'plan' },
  argTypes: {
    checked: {
      control: false,
      description:
        'Never touched by the component (ADR-0013) — use it controlled with `onChange`, or `defaultChecked` uncontrolled.',
      table: { type: { summary: 'boolean' } },
    },
    name: {
      control: 'text',
      description:
        'What pairs the options: radios sharing a `name` are mutually exclusive, and the browser gives that group arrow-key navigation and one tab stop.',
      table: { type: { summary: 'string' } },
    },
    disabled: { control: 'boolean', table: { type: { summary: 'boolean' } } },
  },
};
export default meta;

type Story = StoryObj<typeof Radio>;

/** The row: a native `<label>` wrapping the control. No id, no context. */
const row: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--fm-space-internal-s)',
};
const Option = ({
  children,
  ...props
}: { children: ReactNode } & ComponentProps<typeof Radio>) => (
  <label style={row}>
    <Radio {...props} />
    {children}
  </label>
);

/** The default control surface (drives the Props table). */
export const Default: Story = {
  render: (args) => <Option {...args}>Free</Option>,
};

/**
 * The shape to copy: a `Fieldset` names the group, the shared `name` pairs the
 * options, and each `<label>` labels one of them. This is the whole component —
 * there is no `RadioGroup`, because the platform already groups by `name` and
 * `Fieldset` already names a group.
 */
export const Group: Story = {
  render: () => (
    <Fieldset role="radiogroup">
      <FieldsetLegend>Plan</FieldsetLegend>
      <FieldDescription>You can change this later.</FieldDescription>
      <FieldsetContent>
        <Option name="plan" value="free" defaultChecked>
          Free
        </Option>
        <Option name="plan" value="pro">
          Pro
        </Option>
        <Option name="plan" value="max">
          Max
        </Option>
      </FieldsetContent>
    </Fieldset>
  ),
};

/**
 * The error belongs to the GROUP, not to an option: a `FieldError` inside the
 * `Fieldset` is announced once, and `invalid` sets `aria-invalid` on the
 * `role="radiogroup"`. An individual native radio has no border for us to
 * repaint, so there is deliberately no per-option error look.
 */
export const GroupError: Story = {
  render: () => (
    <Fieldset role="radiogroup" invalid>
      <FieldsetLegend>Plan</FieldsetLegend>
      <FieldsetContent>
        <Option name="plan-err" value="free">
          Free
        </Option>
        <Option name="plan-err" value="pro">
          Pro
        </Option>
      </FieldsetContent>
      <FieldError>Choose a plan to continue.</FieldError>
    </Fieldset>
  ),
};

/** States: unchecked, checked, disabled, and disabled while checked. */
export const States: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--fm-space-stack-s)' }}>
      <Option name="s1">Unchecked</Option>
      <Option name="s2" defaultChecked>
        Checked
      </Option>
      <Option name="s3" disabled>
        Disabled
      </Option>
      <Option name="s4" defaultChecked disabled>
        Disabled, checked
      </Option>
    </div>
  ),
};

/**
 * Laid out in a row — `FieldsetContent` takes the orientation, so the options
 * are not positioned by the control itself.
 */
export const Horizontal: Story = {
  render: () => (
    <Fieldset role="radiogroup">
      <FieldsetLegend>Billing</FieldsetLegend>
      <FieldsetContent orientation="horizontal">
        <Option name="billing" value="monthly" defaultChecked>
          Monthly
        </Option>
        <Option name="billing" value="yearly">
          Yearly
        </Option>
      </FieldsetContent>
    </Fieldset>
  ),
};

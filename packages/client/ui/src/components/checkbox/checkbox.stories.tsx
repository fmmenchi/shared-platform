import { useState, type ComponentProps, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Checkbox } from './checkbox.component.js';
import { Fieldset } from '../fieldset/fieldset.component.js';
import { FieldsetLegend } from '../fieldset-legend/fieldset-legend.component.js';
import { FieldsetContent } from '../fieldset-content/fieldset-content.component.js';
import { FieldDescription } from '../field-description/field-description.component.js';
import { FieldError } from '../field-error/field-error.component.js';

const meta: Meta<typeof Checkbox> = {
  title: 'Components/Inputs/Checkbox',
  component: Checkbox,
  argTypes: {
    indeterminate: {
      control: 'boolean',
      description:
        'The MIXED state. Exists as a prop because `indeterminate` is a DOM property with no HTML attribute — React cannot set it from props, and passing it as one silently does nothing.',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    checked: {
      control: false,
      description:
        'Never touched by the component (ADR-0013) — use it controlled with `onChange`, or `defaultChecked` uncontrolled.',
      table: { type: { summary: 'boolean' } },
    },
    disabled: { control: 'boolean', table: { type: { summary: 'boolean' } } },
  },
};
export default meta;

type Story = StoryObj<typeof Checkbox>;

/** The row: a native `<label>` wrapping the control. No id, no context. */
const Option = ({
  children,
  ...props
}: { children: ReactNode } & ComponentProps<typeof Checkbox>) => (
  <label
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--fm-space-internal-s)',
    }}
  >
    <Checkbox {...props} />
    {children}
  </label>
);

/** A single yes/no choice — consent, opt-in, a toggle that submits with the form. */
export const Default: Story = {
  render: (args) => <Option {...args}>Accept the terms</Option>,
};

/** States: unchecked, checked, mixed, disabled. */
export const States: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--fm-space-stack-s)' }}>
      <Option>Unchecked</Option>
      <Option defaultChecked>Checked</Option>
      <Option indeterminate>Mixed</Option>
      <Option disabled>Disabled</Option>
      <Option defaultChecked disabled>
        Disabled, checked
      </Option>
    </div>
  ),
};

/**
 * Several related boxes: a `Fieldset` names the group. Unlike radios they do
 * NOT pair by `name` — each box is its own value, and each takes its own tab
 * stop.
 */
export const Group: Story = {
  render: () => (
    <Fieldset>
      <FieldsetLegend>Topics</FieldsetLegend>
      <FieldDescription>Pick as many as you like.</FieldDescription>
      <FieldsetContent>
        <Option name="topics" value="a" defaultChecked>
          Alpha
        </Option>
        <Option name="topics" value="b">
          Beta
        </Option>
        <Option name="topics" value="c">
          Gamma
        </Option>
      </FieldsetContent>
    </Fieldset>
  ),
};

/** The error belongs to the group, exactly as it does for radios. */
export const GroupError: Story = {
  render: () => (
    <Fieldset invalid>
      <FieldsetLegend>Topics</FieldsetLegend>
      <FieldsetContent>
        <Option name="t" value="a">
          Alpha
        </Option>
        <Option name="t" value="b">
          Beta
        </Option>
      </FieldsetContent>
      <FieldError>Choose at least one topic.</FieldError>
    </Fieldset>
  ),
};

/**
 * The reason `indeterminate` exists: a parent box summarising its children.
 * The parent is mixed when only some are on — recomputed by the consumer, never
 * by the component. Clicking it settles every child.
 */
export const TriState: Story = {
  render: function TriStateStory() {
    const [on, setOn] = useState([true, false, false]);
    const all = on.every(Boolean);
    const none = on.every((v) => !v);
    return (
      <Fieldset>
        <FieldsetLegend>Topics</FieldsetLegend>
        <FieldsetContent>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--fm-space-internal-s)',
            }}
          >
            <Checkbox
              checked={all}
              indeterminate={!all && !none}
              onChange={(e) => setOn(on.map(() => e.target.checked))}
            />
            All topics
          </label>
          {['Alpha', 'Beta', 'Gamma'].map((name, i) => (
            <label
              key={name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--fm-space-internal-s)',
                marginInlineStart: 'var(--fm-space-inline-m)',
              }}
            >
              <Checkbox
                checked={on[i]}
                onChange={(e) =>
                  setOn(on.map((v, j) => (i === j ? e.target.checked : v)))
                }
              />
              {name}
            </label>
          ))}
        </FieldsetContent>
      </Fieldset>
    );
  },
};

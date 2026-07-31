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
    checked: {
      control: 'select',
      options: [undefined, true, false, 'indeterminate'],
      description:
        'Controlled state. A checkbox has THREE states, so this is not a boolean: `\'indeterminate\'` is the mixed one. Modelling it here rather than as a separate prop (Radix\'s design) makes "mixed" unable to disagree with "checked".',
      table: { type: { summary: "boolean | 'indeterminate'" } },
    },
    defaultChecked: {
      control: false,
      description:
        "Initial state when uncontrolled, `'indeterminate'` included. A starting value only — after that the browser owns the box.",
      table: { type: { summary: "boolean | 'indeterminate'" } },
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

/**
 * States: unchecked, checked, mixed, disabled. The mixed one is CONTROLLED —
 * `indeterminate` with an uncontrolled `checked` produces a box that keeps
 * announcing "mixed" while the value it submits flips, so the component warns
 * about it in development.
 */
export const States: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--fm-space-stack-s)' }}>
      <Option>Unchecked</Option>
      <Option defaultChecked>Checked</Option>
      <Option checked="indeterminate" readOnly>
        Mixed
      </Option>
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

/**
 * The error belongs to the group. Note it is carried by the TEXT, not by ARIA:
 * `aria-invalid` is not supported on `role="group"`, so `invalid` emits only a
 * styling hook and the `FieldError` — which is in the group's
 * `aria-describedby` — does the telling. Do not add `role="radiogroup"` to get
 * `aria-invalid` back; it would report checkboxes as a radio group.
 */
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
              checked={all ? true : none ? false : 'indeterminate'}
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

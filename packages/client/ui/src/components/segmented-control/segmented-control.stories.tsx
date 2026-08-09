import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { SegmentedControl } from './segmented-control.component.js';
import { SegmentedControlItem } from '../segmented-control-item/segmented-control-item.component.js';
import { Button } from '../button/button.component.js';

const meta: Meta<typeof SegmentedControl> = {
  title: 'Components/Buttons/SegmentedControl',
  component: SegmentedControl,
  argTypes: {
    label: {
      control: 'text',
      description:
        'What the set is asking, and the group’s accessible name. Leave it out when something that already names the set wraps it — a `Fieldset` with a legend — since `role="radiogroup"` goes with the name and two names are announced twice.',
      table: { type: { summary: 'string' } },
    },
    name: {
      control: 'text',
      description:
        'The `name` the options share: what pairs them for the platform, and what a form submits the chosen value under.',
      table: { type: { summary: 'string' } },
    },
    value: {
      control: 'text',
      description: 'The selected value. Passing it makes the group controlled.',
      table: { type: { summary: 'string' } },
    },
    defaultValue: {
      control: 'text',
      description: 'The value selected at mount when uncontrolled.',
      table: { type: { summary: 'string' } },
    },
    onValueChange: {
      control: false,
      description: 'Called with the value the user picked, controlled or not.',
      table: { type: { summary: '(value: string) => void' } },
    },
  },
};
export default meta;

type Story = StoryObj<typeof SegmentedControl>;

/** One of a small set, drawn as a row of buttons. The arrows move and select. */
export const Default: Story = {
  args: { label: 'Text alignment', name: 'align', defaultValue: 'left' },
  render: (args) => (
    <SegmentedControl {...args}>
      <SegmentedControlItem value="left">Left</SegmentedControlItem>
      <SegmentedControlItem value="center">Center</SegmentedControlItem>
      <SegmentedControlItem value="right">Right</SegmentedControlItem>
    </SegmentedControl>
  ),
};

/** Driven from React state — the prop is the truth. */
export const Controlled: Story = {
  render: function ControlledGroup() {
    const [range, setRange] = useState('7d');
    return (
      <div style={{ display: 'grid', gap: 'var(--fm-space-stack-s)' }}>
        <SegmentedControl
          label="Date range"
          name="range"
          value={range}
          onValueChange={setRange}
        >
          <SegmentedControlItem value="24h">24 hours</SegmentedControlItem>
          <SegmentedControlItem value="7d">7 days</SegmentedControlItem>
          <SegmentedControlItem value="30d">30 days</SegmentedControlItem>
        </SegmentedControl>
        <span>Showing the last {range}.</span>
      </div>
    );
  },
};

/**
 * It is a radio group, so it is a field: the chosen value submits under `name`
 * and **Reset** puts the set back where it started.
 */
export const InAForm: Story = {
  render: () => (
    <form
      onSubmit={(event) => event.preventDefault()}
      style={{
        display: 'grid',
        gap: 'var(--fm-space-stack-s)',
        width: 'fit-content',
      }}
    >
      <SegmentedControl
        label="Text alignment"
        name="align"
        defaultValue="center"
      >
        <SegmentedControlItem value="left">Left</SegmentedControlItem>
        <SegmentedControlItem value="center">Center</SegmentedControlItem>
        <SegmentedControlItem value="right">Right</SegmentedControlItem>
      </SegmentedControl>
      <div style={{ display: 'flex', gap: 'var(--fm-space-inline-s)' }}>
        <Button type="reset" variant="secondary" size="sm">
          Reset
        </Button>
      </div>
    </form>
  ),
};

/** An option can be unavailable without leaving the set. */
export const WithADisabledOption: Story = {
  render: () => (
    <SegmentedControl label="Export format" name="format" defaultValue="csv">
      <SegmentedControlItem value="csv">CSV</SegmentedControlItem>
      <SegmentedControlItem value="json">JSON</SegmentedControlItem>
      <SegmentedControlItem value="pdf" disabled>
        PDF
      </SegmentedControlItem>
    </SegmentedControl>
  ),
};

/** Right to left: the set runs the other way, and so do the arrows. */
export const RightToLeft: Story = {
  render: () => (
    <div dir="rtl">
      <SegmentedControl
        label="محاذاة النص"
        name="align-rtl"
        defaultValue="right"
      >
        <SegmentedControlItem value="right">يمين</SegmentedControlItem>
        <SegmentedControlItem value="center">وسط</SegmentedControlItem>
        <SegmentedControlItem value="left">يسار</SegmentedControlItem>
      </SegmentedControl>
    </div>
  ),
};

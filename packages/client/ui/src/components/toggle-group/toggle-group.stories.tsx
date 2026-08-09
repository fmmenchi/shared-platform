import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ToggleGroup } from './toggle-group.component.js';
import { ToggleGroupItem } from '../toggle-group-item/toggle-group-item.component.js';
import { Button } from '../button/button.component.js';

const meta: Meta<typeof ToggleGroup> = {
  title: 'Components/Buttons/ToggleGroup',
  component: ToggleGroup,
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

type Story = StoryObj<typeof ToggleGroup>;

/** One of a small set, drawn as a row of buttons. The arrows move and select. */
export const Default: Story = {
  args: { label: 'Text alignment', name: 'align', defaultValue: 'left' },
  render: (args) => (
    <ToggleGroup {...args}>
      <ToggleGroupItem value="left">Left</ToggleGroupItem>
      <ToggleGroupItem value="center">Center</ToggleGroupItem>
      <ToggleGroupItem value="right">Right</ToggleGroupItem>
    </ToggleGroup>
  ),
};

/** Driven from React state — the prop is the truth. */
export const Controlled: Story = {
  render: function ControlledGroup() {
    const [range, setRange] = useState('7d');
    return (
      <div style={{ display: 'grid', gap: 'var(--fm-space-stack-s)' }}>
        <ToggleGroup
          label="Date range"
          name="range"
          value={range}
          onValueChange={setRange}
        >
          <ToggleGroupItem value="24h">24 hours</ToggleGroupItem>
          <ToggleGroupItem value="7d">7 days</ToggleGroupItem>
          <ToggleGroupItem value="30d">30 days</ToggleGroupItem>
        </ToggleGroup>
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
      <ToggleGroup label="Text alignment" name="align" defaultValue="center">
        <ToggleGroupItem value="left">Left</ToggleGroupItem>
        <ToggleGroupItem value="center">Center</ToggleGroupItem>
        <ToggleGroupItem value="right">Right</ToggleGroupItem>
      </ToggleGroup>
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
    <ToggleGroup label="Export format" name="format" defaultValue="csv">
      <ToggleGroupItem value="csv">CSV</ToggleGroupItem>
      <ToggleGroupItem value="json">JSON</ToggleGroupItem>
      <ToggleGroupItem value="pdf" disabled>
        PDF
      </ToggleGroupItem>
    </ToggleGroup>
  ),
};

/** Right to left: the set runs the other way, and so do the arrows. */
export const RightToLeft: Story = {
  render: () => (
    <div dir="rtl">
      <ToggleGroup label="محاذاة النص" name="align-rtl" defaultValue="right">
        <ToggleGroupItem value="right">يمين</ToggleGroupItem>
        <ToggleGroupItem value="center">وسط</ToggleGroupItem>
        <ToggleGroupItem value="left">يسار</ToggleGroupItem>
      </ToggleGroup>
    </div>
  ),
};

import { useState, type ComponentProps, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Switch } from './switch.component.js';
import { ChoiceField } from '../choice-field/choice-field.component.js';

const meta: Meta<typeof Switch> = {
  title: 'Components/Inputs/Switch',
  component: Switch,
  argTypes: {
    checked: {
      control: 'boolean',
      description:
        'Controlled state, passed straight to the element. A switch is on or off — the mixed state belongs to `Checkbox`, which summarises a set.',
      table: { type: { summary: 'boolean' } },
    },
    defaultChecked: {
      control: 'boolean',
      description:
        'Initial state when uncontrolled. A starting value only — after that the DOM owns it, which is what makes `form.reset()` work.',
      table: { type: { summary: 'boolean' } },
    },
    name: {
      control: 'text',
      description:
        'Submitted with the form when the switch is on. Unlike a `Toggle`, this control has a value.',
      table: { type: { summary: 'string' } },
    },
    disabled: { control: 'boolean', table: { type: { summary: 'boolean' } } },
  },
};
export default meta;

type Story = StoryObj<typeof Switch>;

/** The row: a native `<label>` wrapping the control. No id, no context. */
const Setting = ({
  children,
  ...props
}: { children: ReactNode } & ComponentProps<typeof Switch>) => (
  <label
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--fm-space-internal-s)',
    }}
  >
    <Switch {...props} />
    {children}
  </label>
);

/** Label it by nesting it in a `<label>` — no id, and the text joins the target. */
export const Default: Story = {
  render: (args) => <Setting {...args}>Notifications</Setting>,
};

/** Off, on, and unavailable in both states. */
export const States: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--fm-space-stack-s)' }}>
      <Setting>Off</Setting>
      <Setting defaultChecked>On</Setting>
      <Setting disabled>Unavailable, off</Setting>
      <Setting disabled defaultChecked>
        Unavailable, on
      </Setting>
    </div>
  ),
};

/**
 * A settings list, which is what a switch is for: each row applies the moment
 * it is flipped. If one of these needed a Save button, it would want to be a
 * checkbox instead.
 */
export const Settings: Story = {
  render: function SettingsList() {
    const [state, setState] = useState({ email: true, sms: false });
    return (
      <div style={{ display: 'grid', gap: 'var(--fm-space-stack-s)' }}>
        <Setting
          checked={state.email}
          onChange={(event) =>
            setState((s) => ({ ...s, email: event.target.checked }))
          }
        >
          Email me about replies
        </Setting>
        <Setting
          checked={state.sms}
          onChange={(event) =>
            setState((s) => ({ ...s, sms: event.target.checked }))
          }
        >
          Text me about replies
        </Setting>
      </div>
    );
  },
};

/**
 * In a form it is a field like any other: it has a `name`, it submits, and
 * `Reset` puts it back — none of which a `Toggle` has, because a toggle has no
 * value at all.
 */
export const InAForm: Story = {
  render: () => (
    <form
      onSubmit={(event) => event.preventDefault()}
      style={{ display: 'grid', gap: 'var(--fm-space-stack-s)' }}
    >
      <Setting name="notify" defaultChecked>
        Notifications
      </Setting>
      <div style={{ display: 'flex', gap: 'var(--fm-space-inline-s)' }}>
        <button type="reset">Reset</button>
      </div>
    </form>
  ),
};

/** With a hint or an error, the wiring a bare `<label>` cannot do. */
export const WithAChoiceField: Story = {
  render: () => (
    <ChoiceField label="Notifications" hint="We email once a week, at most.">
      <Switch name="notify" defaultChecked />
    </ChoiceField>
  ),
};

/** Right-to-left: the knob starts and ends at the other side. */
export const RightToLeft: Story = {
  render: () => (
    <div dir="rtl" style={{ display: 'grid', gap: 'var(--fm-space-stack-s)' }}>
      <Setting>مغلق</Setting>
      <Setting defaultChecked>مفتوح</Setting>
    </div>
  ),
};

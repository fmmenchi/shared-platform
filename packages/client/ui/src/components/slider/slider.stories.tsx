import { useId, useState, type ComponentProps, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Slider } from './slider.component.js';

const meta: Meta<typeof Slider> = {
  title: 'Components/Inputs/Slider',
  component: Slider,
  argTypes: {
    value: {
      control: 'number',
      description:
        'Controlled value, passed straight to the element. Pair with `onChange`; the component never wraps or intercepts either.',
      table: { type: { summary: 'number | string' } },
    },
    defaultValue: {
      control: 'number',
      description:
        'Initial value when uncontrolled. A starting value only — after that the DOM owns it, which is what makes `form.reset()` work. Absent, the browser starts at the midpoint of `min`/`max`.',
      table: { type: { summary: 'number | string' } },
    },
    min: {
      control: 'number',
      description: 'Lower bound, native. Defaults to the platform’s 0.',
      table: {
        type: { summary: 'number | string' },
        defaultValue: { summary: '0' },
      },
    },
    max: {
      control: 'number',
      description: 'Upper bound, native. Defaults to the platform’s 100.',
      table: {
        type: { summary: 'number | string' },
        defaultValue: { summary: '100' },
      },
    },
    step: {
      control: 'number',
      description:
        'Granularity, native — the arrows move by one step, `PageUp`/`PageDown` by a larger native jump.',
      table: {
        type: { summary: 'number | string' },
        defaultValue: { summary: '1' },
      },
    },
    name: {
      control: 'text',
      description: 'Submitted with the form, like any field.',
      table: { type: { summary: 'string' } },
    },
    getValueText: {
      control: false,
      description:
        'Formats the current value into the announced `aria-valuetext` — `(v) => `${v} minutes``. Kept fresh by the component itself as the user drags, so it is safe uncontrolled; prefer it over a static `aria-valuetext`.',
      table: { type: { summary: '(value: number) => string' } },
    },
    'aria-valuetext': {
      control: 'text',
      description:
        'Static announced value, passed straight through. CONTROLLED usage only — re-render it from `onChange`, or it goes stale and overrides the correct number. Uncontrolled, use `getValueText`.',
      table: { type: { summary: 'string' } },
    },
    disabled: { control: 'boolean', table: { type: { summary: 'boolean' } } },
  },
};
export default meta;

type Story = StoryObj<typeof Slider>;

/**
 * The row: an EXTERNAL `<label htmlFor>` — a range input holds no text, so
 * nesting buys nothing and the explicit pair keeps the name visible.
 */
const Labelled = ({
  children,
  ...props
}: { children: ReactNode } & ComponentProps<typeof Slider>) => {
  const id = useId();
  return (
    <div style={{ display: 'grid', gap: 'var(--fm-space-stack-xs)' }}>
      <label htmlFor={id}>{children}</label>
      <Slider id={id} {...props} />
    </div>
  );
};

/** Label it with `<label htmlFor>`; the browser holds the value. */
export const Default: Story = {
  render: (args) => <Labelled {...args}>Volume</Labelled>,
};

/** At rest, moved, and unavailable — the fill follows the value. */
export const States: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--fm-space-stack-s)' }}>
      <Labelled defaultValue={0}>Empty</Labelled>
      <Labelled defaultValue={70}>Mostly there</Labelled>
      <Labelled disabled defaultValue={40}>
        Unavailable
      </Labelled>
    </div>
  ),
};

/** `min`/`max`/`step` go to the element untouched — so does the keyboard. */
export const CustomRange: Story = {
  render: () => (
    <Labelled min={0} max={250} step={25} defaultValue={100}>
      Budget (steps of 25)
    </Labelled>
  ),
};

/**
 * Controlled like any native input: `value` + `onChange`, the parent's state
 * as the single source of truth — with `getValueText` giving the announced
 * value its units, so what is heard matches what is shown. The formatter works
 * uncontrolled too (the component keeps it fresh as the user drags), which is
 * why it is preferred over a static `aria-valuetext`.
 */
export const Controlled: Story = {
  render: function ControlledSlider() {
    const [minutes, setMinutes] = useState(30);
    const id = useId();
    return (
      <div style={{ display: 'grid', gap: 'var(--fm-space-stack-xs)' }}>
        <label htmlFor={id}>Reminder</label>
        <Slider
          id={id}
          min={5}
          max={120}
          step={5}
          value={minutes}
          getValueText={(v) => `${v} minutes`}
          onChange={(event) => setMinutes(event.target.valueAsNumber)}
        />
        <output htmlFor={id}>{minutes} minutes</output>
      </div>
    );
  },
};

/**
 * In a form it is a field like any other: it has a `name`, it submits, and
 * `Reset` puts BOTH facts back — the value and the painted fill — because the
 * DOM owns the first and the component re-reads it for the second.
 */
export const InAForm: Story = {
  render: () => (
    <form
      onSubmit={(event) => event.preventDefault()}
      style={{ display: 'grid', gap: 'var(--fm-space-stack-s)' }}
    >
      <Labelled name="volume" defaultValue={30}>
        Volume
      </Labelled>
      <div style={{ display: 'flex', gap: 'var(--fm-space-inline-s)' }}>
        <button type="reset">Reset</button>
      </div>
    </form>
  ),
};

/** Right-to-left: the whole control flips natively; the fill follows. */
export const RightToLeft: Story = {
  render: () => (
    <div dir="rtl">
      <Labelled defaultValue={30}>مستوى الصوت</Labelled>
    </div>
  ),
};

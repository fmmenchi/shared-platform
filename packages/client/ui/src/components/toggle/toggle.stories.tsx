import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Toggle } from './toggle.component.js';

/** Decorative demo icons (the DS ships none — apps inject their own). */
const icon = (path: string) => (
  <svg
    width="1em"
    height="1em"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={path} />
  </svg>
);
const BoldIcon = icon('M6 4h8a4 4 0 0 1 0 8H6zM6 12h9a4 4 0 0 1 0 8H6z');
const ItalicIcon = icon('M19 4h-9M14 20H5M15 4L9 20');
const UnderlineIcon = icon('M6 3v7a6 6 0 0 0 12 0V3M4 21h16');

const meta: Meta<typeof Toggle> = {
  title: 'Components/Buttons/Toggle',
  component: Toggle,
  args: { children: 'Bold' },
  // The Props table is CURATED here: Toggle inherits Button's polymorphic
  // signature, which defeats react-docgen (see Guidelines/Component docs).
  argTypes: {
    pressed: {
      control: 'boolean',
      description:
        'Whether the button is pressed. Passing it makes the state **controlled** — the prop drives and `onPressedChange` reports the press.',
      table: { type: { summary: 'boolean' } },
    },
    defaultPressed: {
      control: 'boolean',
      description: 'Starting state when uncontrolled.',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    onPressedChange: {
      control: false,
      description:
        'Called with the state the press asks for, controlled or not. `event.preventDefault()` in `onClick` calls the press off before it fires.',
      table: { type: { summary: '(pressed: boolean) => void' } },
    },
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
      description: 'Control size — Button’s scale, unchanged.',
      table: {
        type: { summary: "'sm' | 'md' | 'lg'" },
        defaultValue: { summary: "'md'" },
      },
    },
    children: {
      control: 'text',
      description: 'Toggle content.',
      table: { type: { summary: 'ReactNode' } },
    },
    icon: {
      control: false,
      description:
        'Decorative leading icon. Icon-only usage requires `aria-label`.',
      table: { type: { summary: 'ReactNode' } },
    },
    disabled: {
      control: 'boolean',
      description: 'Native `disabled` — unavailable, in either state.',
      table: { type: { summary: 'boolean' } },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Toggle>;

/** Uncontrolled: it holds its own state and reports every press. */
export const Default: Story = {};

/** Starts pressed. */
export const Pressed: Story = { args: { defaultPressed: true } };

/**
 * The case this component exists for: a toolbar acting on the current
 * selection. Each toggle is independent — for "one of these", that is a radio
 * group, not three toggles.
 */
export const Toolbar: Story = {
  render: () => (
    <div
      role="group"
      aria-label="Text formatting"
      style={{ display: 'flex', gap: 'var(--fm-space-inline-2xs)' }}
    >
      <Toggle icon={BoldIcon} aria-label="Bold" defaultPressed />
      <Toggle icon={ItalicIcon} aria-label="Italic" />
      <Toggle icon={UnderlineIcon} aria-label="Underline" />
    </div>
  ),
};

/**
 * Icon-only needs `aria-label`: the icon is decorative, so without one the
 * button has no accessible name and a screen reader announces "button, pressed"
 * with no subject.
 */
export const IconOnly: Story = {
  // A `render`, not `args`: `children: undefined` relies on Storybook's arg
  // merge dropping the meta-level "Bold", and a story that silently kept its
  // label would still pass while showing the opposite of what it claims.
  render: () => <Toggle icon={BoldIcon} aria-label="Bold" />,
};

/** Driven from React state — the prop is the truth and wins back every press. */
export const Controlled: Story = {
  render: function ControlledToggle() {
    const [on, setOn] = useState(false);
    return (
      <div style={{ display: 'grid', gap: 'var(--fm-space-stack-s)' }}>
        <Toggle pressed={on} onPressedChange={setOn}>
          Show the grid
        </Toggle>
        <span>The grid is {on ? 'showing' : 'hidden'}.</span>
      </div>
    );
  },
};

/** Off, on, and unavailable in both states. */
export const States: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--fm-space-inline-s)' }}>
      <Toggle>Off</Toggle>
      <Toggle defaultPressed>On</Toggle>
      <Toggle disabled>Off, disabled</Toggle>
      <Toggle defaultPressed disabled>
        On, disabled
      </Toggle>
    </div>
  ),
};

/** The sizes are Button’s; under a coarse pointer all three are 44px tall. */
export const Sizes: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        gap: 'var(--fm-space-inline-s)',
        alignItems: 'center',
      }}
    >
      <Toggle size="sm" defaultPressed>
        Small
      </Toggle>
      <Toggle size="md" defaultPressed>
        Medium
      </Toggle>
      <Toggle size="lg" defaultPressed>
        Large
      </Toggle>
    </div>
  ),
};

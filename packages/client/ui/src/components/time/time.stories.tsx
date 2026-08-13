import type { Meta, StoryObj } from '@storybook/react-vite';
import { Time } from './time.component.js';

/** Midnight UTC on New Year's Day — the instant that is two different days. */
const NEW_YEAR = '2026-01-01T00:00:00Z';

const meta: Meta<typeof Time> = {
  title: 'Components/Data display/Time',
  component: Time,
  args: { value: NEW_YEAR, timeZone: 'UTC' },
  argTypes: {
    value: {
      description:
        'The instant: a `Date`, a timestamp, or the ISO string an API delivers.',
      table: { type: { summary: 'Date | number | string | null | undefined' } },
    },
    format: {
      control: 'inline-radio',
      options: ['date', 'dateTime', 'time'],
      description: 'How much of the instant to show.',
      table: {
        type: { summary: "'date' | 'dateTime' | 'time'" },
        defaultValue: { summary: "'date'" },
      },
    },
    dateStyle: {
      control: 'inline-radio',
      options: ['full', 'long', 'medium', 'short'],
      description: "How much of the DATE — `Intl`'s own four.",
      table: {
        type: { summary: "'full' | 'long' | 'medium' | 'short'" },
        defaultValue: { summary: "'medium'" },
      },
    },
    timeStyle: {
      control: 'inline-radio',
      options: ['full', 'long', 'medium', 'short'],
      description: 'How much of the CLOCK, when the format shows one.',
      table: {
        type: { summary: "'full' | 'long' | 'medium' | 'short'" },
        defaultValue: { summary: "'short'" },
      },
    },
    timeZone: {
      description:
        'The zone the instant is read in. Left out, the app’s answer from `UiProvider`; left out there too, the runtime’s.',
      table: { type: { summary: 'string' } },
    },
    fallback: {
      description:
        'What to render when there is no instant. Nothing by default — a `<time>` with no date and no words states nothing.',
      table: {
        type: { summary: 'ReactNode' },
        defaultValue: { summary: 'null' },
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Time>;

export const Date_: Story = { name: 'Date' };

/** Every date style, on one instant. */
export const Styles: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 'var(--fm-space-stack-xs)' }}>
      {(['short', 'medium', 'long', 'full'] as const).map((style) => (
        <Time key={style} {...args} dateStyle={style} />
      ))}
    </div>
  ),
};

/** A date with a clock, and a clock on its own. */
export const WithTime: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 'var(--fm-space-stack-xs)' }}>
      <Time {...args} value="2026-01-31T14:05:00Z" format="dateTime" />
      <Time {...args} value="2026-01-31T14:05:00Z" format="time" />
    </div>
  ),
};

/**
 * The same instant in two zones — the reason the zone is a parameter and not an
 * assumption. Inspect the DOM: `dateTime` moves with the visible date, because
 * one element may not make two claims.
 */
export const Zones: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 'var(--fm-space-stack-xs)' }}>
      <Time {...args} timeZone="Europe/Rome" />
      <Time {...args} timeZone="America/Lima" />
    </div>
  ),
};

/** Nothing to show, and the screen deciding what that looks like. */
export const Missing: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gap: 'var(--fm-space-stack-xs)' }}>
      <Time {...args} value={null} fallback="—" />
      <Time {...args} value={null} fallback={<em>never</em>} />
    </div>
  ),
};

import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { DateInput } from './date-input.component.js';
import { Field } from '../field/field.component.js';
import type { CivilDate } from '../../date/civil-date.types.js';

const meta: Meta<typeof DateInput> = {
  title: 'Components/Inputs/DateInput',
  component: DateInput,
  args: { 'aria-label': 'Due date' },
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
      description:
        'Height axis, shared with `Input` and `Button` so a row lines up. `md` grows to 44px on a coarse pointer.',
      table: {
        type: { summary: "'sm' | 'md' | 'lg'" },
        defaultValue: { summary: "'md'" },
      },
    },
    defaultValue: {
      control: 'text',
      description:
        'The initial value, as the DOM holds it: `YYYY-MM-DD`. Uncontrolled — the browser keeps it, so `form.reset()` works.',
      table: { type: { summary: 'string' } },
    },
    defaultDate: {
      control: false,
      description:
        'The same seed, as a day: `{ year, month, day }`. Sugar over `defaultValue`, which still wins if both are given. A day that does not exist seeds nothing.',
      table: { type: { summary: 'CivilDate' } },
    },
    onDateChange: {
      control: false,
      description:
        'Runs BESIDE `onChange` with the value parsed — `{ year, month, day }`, or `null` while the field names no day. Months are 1–12, and no timezone can move it.',
      table: { type: { summary: '(date: CivilDate | null) => void' } },
    },
    min: {
      control: 'text',
      description:
        'Earliest allowed day, `YYYY-MM-DD`. Feeds `rangeUnderflow`.',
      table: { type: { summary: 'string' } },
    },
    max: {
      control: 'text',
      description: 'Latest allowed day, `YYYY-MM-DD`. Feeds `rangeOverflow`.',
      table: { type: { summary: 'string' } },
    },
    disabled: {
      control: 'boolean',
      description: 'Native `disabled`.',
      table: { type: { summary: 'boolean' } },
    },
  },
};
export default meta;

type Story = StoryObj<typeof DateInput>;

/** The field, as it ships. The picker it opens is the browser's own. */
export const Basic: Story = { args: { defaultValue: '2026-08-12' } };

/** The three heights, matching `Input` and `Button` so a row lines up. */
export const Sizes: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gap: 'var(--fm-space-stack-s)',
        maxInlineSize: '20rem',
      }}
    >
      <DateInput aria-label="Small" size="sm" defaultValue="2026-08-12" />
      <DateInput aria-label="Medium" size="md" defaultValue="2026-08-12" />
      <DateInput aria-label="Large" size="lg" defaultValue="2026-08-12" />
    </div>
  ),
};

/** Labelled, hinted and in error — the `Field` wiring, unchanged from `Input`. */
export const InAField: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gap: 'var(--fm-space-stack-m)',
        maxInlineSize: '20rem',
      }}
    >
      <Field label="Start" hint="Weekdays only.">
        <DateInput defaultValue="2026-08-12" />
      </Field>
      <Field label="End" error="Cannot be before the start.">
        <DateInput defaultValue="2026-08-01" />
      </Field>
    </div>
  ),
};

/**
 * `min`/`max` are an INTERVAL, and that is the whole of what the platform
 * offers: they reach `ValidityState` and `:user-invalid`, but they cannot say
 * "not that Tuesday". Per-date rules are what `Calendar` is for.
 */
export const Bounded: Story = {
  args: { min: '2026-08-01', max: '2026-08-31', defaultValue: '2026-08-12' },
};

/**
 * The reason this component exists. The DOM keeps the ISO string; `onDateChange`
 * hands back the day itself — and doing that conversion by hand with
 * `new Date(value)` reports the day BEFORE, everywhere west of Greenwich.
 */
export const ReadingTheDay: Story = {
  render: function ReadingTheDayStory() {
    const [day, setDay] = useState<CivilDate | null>(null);
    return (
      <div
        style={{
          display: 'grid',
          gap: 'var(--fm-space-stack-s)',
          maxInlineSize: '20rem',
        }}
      >
        <Field label="Due">
          <DateInput defaultValue="2026-08-12" onDateChange={setDay} />
        </Field>
        <output style={{ fontFamily: 'var(--fm-font-mono)' }}>
          {day === null ? 'no day' : `${day.year} / ${day.month} / ${day.day}`}
        </output>
      </div>
    );
  },
};

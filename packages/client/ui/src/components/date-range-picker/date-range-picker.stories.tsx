import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { DateRangePicker } from './date-range-picker.component.js';
import { Fieldset } from '../fieldset/fieldset.component.js';
import { FieldsetLegend } from '../fieldset-legend/fieldset-legend.component.js';
import { FieldsetContent } from '../fieldset-content/fieldset-content.component.js';
import { weekdayOf } from '../../date/civil-math.js';
import type { CivilDate, CivilRange } from '../../date/civil-date.types.js';

const AUGUST: CivilDate = { year: 2026, month: 8, day: 1 };

const meta = {
  title: 'Components/Inputs/DateRangePicker',
  component: DateRangePicker,
  parameters: {
    docs: {
      description: {
        component:
          'Two date fields and one calendar, for a stay rather than a day — two names, two entries, one choice.',
      },
    },
  },
} satisfies Meta<typeof DateRangePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

const base = {
  startName: 'checkIn',
  endName: 'checkOut',
  startLabel: 'Arrivo',
  endLabel: 'Partenza',
  defaultMonth: AUGUST,
} as const;

/**
 * One tag. Two fields inside one border, one trigger, and a popover that waits
 * for the second click — closing on the first would ask the user to reopen the
 * calendar to finish what they had just started.
 */
export const Default: Story = {
  args: { ...base },
  render: (args) => (
    <Fieldset>
      <FieldsetLegend>Il tuo soggiorno</FieldsetLegend>
      <FieldsetContent>
        <DateRangePicker {...args} />
      </FieldsetContent>
    </Fieldset>
  ),
};

/** Seeded with a stay, in ISO. The calendar opens on it, ends and span drawn. */
export const WithAStay: Story = {
  args: { ...base, defaultStart: '2026-08-12', defaultEnd: '2026-08-15' },
  render: (args) => (
    <Fieldset>
      <FieldsetLegend>Il tuo soggiorno</FieldsetLegend>
      <FieldsetContent>
        <DateRangePicker {...args} />
      </FieldsetContent>
    </Fieldset>
  ),
};

/**
 * THE AIRBNB SHAPE: `pickOnly`, where neither field is typed into and both are
 * the calendar's trigger. Reach for it when the user does not already know the
 * dates — the answer is in the grid, next to the days that are taken.
 */
export const PickOnly: Story = {
  args: { ...base, defaultStart: '2026-08-12', pickOnly: true },
  render: (args) => (
    <Fieldset>
      <FieldsetLegend>Il tuo soggiorno</FieldsetLegend>
      <FieldsetContent>
        <DateRangePicker {...args} />
      </FieldsetContent>
    </Fieldset>
  ),
};

/**
 * THE REASON THE CALENDAR EXISTS, on a range: `min`/`max` are an interval, not
 * a set, so "never on a Sunday and these three days are booked" cannot be said
 * to the platform at all.
 *
 * It refuses days in the GRID only. Dates typed into the fields pass through
 * every intermediate value on their way to a valid one.
 */
export const PerDateRules: Story = {
  args: { ...base },
  render: (args) => {
    const booked = ['2026-08-18', '2026-08-19', '2026-08-27'];
    return (
      <Fieldset>
        <FieldsetLegend>Il tuo soggiorno</FieldsetLegend>
        <FieldsetContent>
          <DateRangePicker
            {...args}
            isDateDisabled={(date) => {
              const iso = `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
              return weekdayOf(date) === 0 || booked.includes(iso);
            }}
          />
        </FieldsetContent>
      </Fieldset>
    );
  },
};

/**
 * What it hands back, and WHEN: on every move, half-made included. The first
 * click reports `{ start, end: null }`, so a consumer can draw that state
 * rather than waiting in the dark for the second.
 */
export const ReadingTheValue: Story = {
  args: { ...base },
  render: function ReadingTheValueStory(args) {
    const [range, setRange] = useState<CivilRange | null>(null);
    return (
      <div style={{ display: 'grid', gap: 'var(--fm-space-stack-m)' }}>
        <Fieldset>
          <FieldsetLegend>Il tuo soggiorno</FieldsetLegend>
          <FieldsetContent>
            <DateRangePicker {...args} onRangeChange={setRange} />
          </FieldsetContent>
        </Fieldset>
        <output
          style={{ font: 'var(--fm-font-mono, monospace)', opacity: 0.7 }}
        >
          {range === null ? 'null' : JSON.stringify(range)}
        </output>
      </div>
    );
  },
};

import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Calendar } from './calendar.component.js';
import { UiProvider } from '../../i18n/provider.js';
import { weekdayOf } from '../../date/civil-math.js';
import type { CivilDate } from '../../date/civil-date.types.js';

const AUGUST: CivilDate = { year: 2026, month: 8, day: 12 };

const meta = {
  title: 'Components/Inputs/Calendar',
  component: Calendar,
  parameters: {
    docs: {
      description: {
        component:
          'A month of days, for picking one — and the answer to the thing no native date control offers: per-date disabling.',
      },
    },
  },
} satisfies Meta<typeof Calendar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { defaultMonth: AUGUST },
};

/**
 * THE REASON IT EXISTS. `min`/`max` on a native date input are an interval, not
 * a set — so "never on a Sunday, and these three days are booked" cannot be said
 * to the platform at all. Here it is a predicate.
 */
export const PerDateRules: Story = {
  args: { defaultMonth: AUGUST },
  render: (args) => {
    const booked = ['2026-08-18', '2026-08-19', '2026-08-27'];
    return (
      <Calendar
        {...args}
        isDateDisabled={(date) => {
          const iso = `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
          return weekdayOf(date) === 0 || booked.includes(iso);
        }}
      />
    );
  },
};

/** The value comes back as a day — `{ year, month, day }` — and never a `Date`. */
export const ReadingTheValue: Story = {
  args: { defaultMonth: AUGUST },
  render: function ReadingTheValueStory(args) {
    const [value, setValue] = useState<CivilDate | null>(null);
    return (
      <div style={{ display: 'grid', gap: 'var(--fm-space-stack-m)' }}>
        <Calendar {...args} value={value} onValueChange={setValue} />
        <output
          style={{ font: 'var(--fm-font-mono, monospace)', opacity: 0.7 }}
        >
          {value === null ? 'null' : JSON.stringify(value)}
        </output>
      </div>
    );
  },
};

/**
 * The month name, the weekday names and the day a week starts on all come from
 * the locale the provider was given — the same one `DateInput` and `Time` read.
 */
export const AcrossLocales: Story = {
  args: { defaultMonth: AUGUST },
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
      {['it', 'en-US', 'ja-JP', 'ar-EG'].map((locale) => (
        <UiProvider key={locale} adapters={{ i18n: { locale } }}>
          <Calendar {...args} />
        </UiProvider>
      ))}
    </div>
  ),
};

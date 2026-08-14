import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { DatePicker } from './date-picker.component.js';
import { Field } from '../field/field.component.js';
import { UiProvider } from '../../i18n/provider.js';
import { weekdayOf } from '../../date/civil-math.js';
import type { CivilDate } from '../../date/civil-date.types.js';

const meta = {
  title: 'Components/Inputs/DatePicker',
  component: DatePicker,
  parameters: {
    docs: {
      description: {
        component:
          'A date field with a calendar behind it — the five-step composition of `DateInput`, `Popover` and `Calendar`, done once and correctly.',
      },
    },
  },
} satisfies Meta<typeof DatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * One tag. The field is typed into as a field, the calendar is opened from the
 * trigger inside the border, and the two never disagree about which day is
 * chosen.
 */
export const Default: Story = {
  args: { name: 'departure', 'aria-label': 'Data di partenza' },
  render: (args) => (
    <Field label="Data di partenza">
      <DatePicker {...args} aria-label={undefined} />
    </Field>
  ),
};

/**
 * SEEDED WITH A DATE, in ISO — the one format that means the same day
 * everywhere. The field shows it the way the locale writes it, and the calendar
 * opens on it rather than on today.
 */
export const WithAValue: Story = {
  args: {
    name: 'departure',
    defaultValue: '2026-08-12',
    'aria-label': 'Data di partenza',
  },
  render: (args) => (
    <Field label="Data di partenza">
      <DatePicker {...args} aria-label={undefined} />
    </Field>
  ),
};

/**
 * THE REASON THE CALENDAR EXISTS. `min`/`max` on a native date input are an
 * interval, not a set — "never on a Sunday, and these three days are booked"
 * cannot be said to the platform at all. Here it is a predicate.
 *
 * It refuses days in the GRID only. A date typed into the field passes through
 * every intermediate value on its way to a valid one, so refusing them as they
 * are typed would make the field unusable; validate on submit as you would
 * anyway.
 */
export const PerDateRules: Story = {
  args: {
    name: 'appointment',
    defaultValue: '2026-08-12',
    'aria-label': 'Appuntamento',
  },
  render: (args) => {
    const booked = ['2026-08-18', '2026-08-19', '2026-08-27'];
    return (
      <Field label="Appuntamento">
        <DatePicker
          {...args}
          aria-label={undefined}
          isDateDisabled={(date) => {
            const iso = `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
            return weekdayOf(date) === 0 || booked.includes(iso);
          }}
        />
      </Field>
    );
  },
};

/**
 * THE OTHER SHAPE, and the one to reach for when the user does NOT already know
 * the date: `pickOnly`. The field stops being typed into and becomes the target
 * itself — click anywhere on it, or press Enter, Space or ArrowDown, and the
 * calendar opens.
 *
 * The reasoning: a typeable field has a caret to protect, so the trigger is a
 * separate target; a field that cannot be typed into has nothing to protect, so
 * the whole field is the target.
 *
 * WHICH ONE TO CHOOSE is a question about the date, not about the design.
 * A date the user KNOWS — a birth date, an expiry, an invoice date — tends to be
 * faster typed than navigated. A date the user CHOOSES from what is available —
 * a booking, an appointment, a flight — is the opposite: typing means little,
 * because the answer is in the grid next to the days that are taken.
 *
 * It is a prop of OURS rather than the platform's `readonly`, and the first
 * version got that wrong: `readonly` means "the user cannot modify this value",
 * and the trigger beside the field modifies it — a state exposed to assistive
 * technology that was simply false. This refuses the typing at `beforeinput`
 * instead, and the field says what it is: a textbox with a dialog behind it.
 *
 * `readOnly` still works and now means what it says — it disables the trigger
 * too, so nothing can change the value.
 */
export const PickOnly: Story = {
  args: {
    name: 'checkin',
    defaultValue: '2026-08-12',
    pickOnly: true,
    'aria-label': 'Check-in',
  },
  render: (args) => (
    <Field label="Check-in">
      <DatePicker {...args} aria-label={undefined} />
    </Field>
  ),
};

/** What it hands back: a `CivilDate`, never a `Date`. */
export const ReadingTheValue: Story = {
  args: { name: 'departure', 'aria-label': 'Data di partenza' },
  render: function ReadingTheValueStory(args) {
    const [value, setValue] = useState<CivilDate | null>(null);
    return (
      <div style={{ display: 'grid', gap: 'var(--fm-space-stack-m)' }}>
        <Field label="Data di partenza">
          <DatePicker
            {...args}
            aria-label={undefined}
            onDateChange={setValue}
          />
        </Field>
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
 * The field's order and separator, the month and weekday names, the digits and
 * the day a week starts on all come from the locale the provider was given.
 */
export const AcrossLocales: Story = {
  args: { name: 'departure', defaultValue: '2026-08-12' },
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
      {['it', 'en-US', 'ja-JP', 'ar-EG'].map((locale) => (
        <UiProvider key={locale} adapters={{ i18n: { locale } }}>
          <div style={{ inlineSize: '14rem' }}>
            <Field label={locale}>
              <DatePicker {...args} />
            </Field>
          </div>
        </UiProvider>
      ))}
    </div>
  ),
};

/** Disabled together: a field nobody can type in gets no trigger either. */
export const Disabled: Story = {
  args: {
    name: 'departure',
    defaultValue: '2026-08-12',
    disabled: true,
    'aria-label': 'Data di partenza',
  },
  render: (args) => (
    <Field label="Data di partenza">
      <DatePicker {...args} aria-label={undefined} />
    </Field>
  ),
};

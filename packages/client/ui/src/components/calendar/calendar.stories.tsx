import { useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Calendar } from './calendar.component.js';
import { DateInput } from '../date-input/date-input.component.js';
import { Field } from '../field/field.component.js';
import { Popover } from '../popover/popover.component.js';
import { PopoverTrigger } from '../popover-trigger/popover-trigger.component.js';
import { PopoverContent } from '../popover-content/popover-content.component.js';
import { writeDateInput } from '../../date/write-date-input.js';
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
 * THE PICKER, which is the shape most consumers will actually use — and the one
 * ADR-0027 describes: the calendar composes inside a `Popover` and **sets the
 * field rather than replacing it**. The field remains the field: it can still be
 * typed into, it still holds the value, and it is still what the form posts.
 *
 * Nothing here is a new component. `Popover` + `Calendar` + `DateInput` is the
 * whole of it, wired by `carrierRef` and `writeDateInput` — which writes the DOM
 * exactly as a keystroke does, so the field redraws and a form binding hears it.
 */
export const InsideAPopover: Story = {
  args: { defaultMonth: AUGUST },
  render: function PickerStory() {
    const carrier = useRef<HTMLInputElement>(null);
    const [open, setOpen] = useState(false);
    const [picked, setPicked] = useState<CivilDate | null>(null);
    return (
      <Field label="Data di partenza">
        <div style={{ display: 'flex', gap: 'var(--fm-space-inline-s)' }}>
          {/* THE OTHER DIRECTION, and the recipe is wrong without it: the
              calendar writes the field, and the field has to tell the calendar
              back. Typed into rather than picked from, the highlight would stay
              on the day chosen three edits ago — so reopening the popover would
              show a selection the field no longer holds. */}
          <DateInput
            name="departure"
            carrierRef={carrier}
            defaultDate={AUGUST}
            onDateChange={setPicked}
          />
          <Popover open={open} onOpenChange={setOpen} placement="bottom-end">
            {/* `PopoverTrigger` IS a `Button` — nesting one inside it makes two
                interactive controls in one place, which axe calls
                `nested-interactive` and a keyboard user meets as two tab stops
                for one affordance. */}
            <PopoverTrigger
              variant="secondary"
              aria-label="Scegli dal calendario"
            >
              📅
            </PopoverTrigger>
            <PopoverContent>
              <Calendar
                value={picked}
                defaultMonth={AUGUST}
                onValueChange={(date) => {
                  setPicked(date);
                  // The field is SET, not replaced.
                  writeDateInput(carrier.current, date);
                  setOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
      </Field>
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

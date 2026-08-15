import { useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Calendar } from './calendar.component.js';
import { DateInput } from '../date-input/date-input.component.js';
import { Field } from '../field/field.component.js';
import { InputGroup } from '../input-group/input-group.component.js';
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
        {/* NAMED rather than spread — and the rule is narrower than an earlier
            version of this comment claimed. A union spread on its own is fine;
            what fails is spreading it beside props that are MEMBERS of the
            union, `value` and `onValueChange` here, because TypeScript cannot
            then tell which member the result is meant to be. That is the whole
            ergonomic cost of discriminating on `selection`, and it is paid at
            the few call sites that set the value explicitly. */}
        <Calendar
          defaultMonth={args.defaultMonth}
          selection="day"
          value={value}
          onValueChange={setValue}
        />
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
    const [picked, setPicked] = useState<CivilDate | null>(AUGUST);
    const [month, setMonth] = useState<CivilDate>(AUGUST);
    // BOTH, and this is the whole of what the composition owes. The selection
    // for the highlight, the month so the highlight is on a day the grid draws.
    const take = (date: CivilDate | null) => {
      setPicked(date);
      if (date !== null) setMonth(date);
    };
    return (
      <Field label="Data di partenza">
        <div style={{ display: 'flex', gap: 'var(--fm-space-inline-s)' }}>
          {/* THE OTHER DIRECTION, and the recipe is wrong without it: the
              calendar writes the field, and the field has to tell the calendar
              back. Typed into rather than picked from, the highlight would stay
              on the day chosen three edits ago — so reopening the popover would
              show a selection the field no longer holds, in a month it is not
              even drawing. */}
          <DateInput
            name="departure"
            carrierRef={carrier}
            defaultDate={AUGUST}
            onDateChange={take}
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
                month={month}
                onMonthChange={setMonth}
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
 * THE SAME PICKER WITH THE TRIGGER INSIDE THE FIELD, which is what most designs
 * ask for — and it needs nothing new: `InputGroup` takes the border, the fill
 * and the radius, and whatever you inset sits inside them.
 *
 * `DateInput` is untouched by this. It renders three siblings — the visible
 * field, the format hint and the carrier — and the last two are `sr-only`,
 * therefore absolutely positioned, therefore out of the flex flow: they add no
 * gap and no width. The group's reset matches `> input`, so it strips the
 * chrome from the field AND from the carrier, which draws nothing anyway.
 */
export const IconInsideTheField: Story = {
  args: { defaultMonth: AUGUST },
  render: function InsetPickerStory() {
    const carrier = useRef<HTMLInputElement>(null);
    const [open, setOpen] = useState(false);
    const [picked, setPicked] = useState<CivilDate | null>(null);
    const [month, setMonth] = useState<CivilDate>(AUGUST);
    const take = (date: CivilDate | null) => {
      setPicked(date);
      if (date !== null) setMonth(date);
    };
    return (
      <Field label="Data di partenza">
        <InputGroup>
          <DateInput
            name="departure"
            carrierRef={carrier}
            onDateChange={take}
          />
          <Popover open={open} onOpenChange={setOpen} placement="bottom-end">
            <PopoverTrigger variant="ghost" aria-label="Scegli dal calendario">
              📅
            </PopoverTrigger>
            <PopoverContent>
              <Calendar
                value={picked}
                month={month}
                onMonthChange={setMonth}
                onValueChange={(date) => {
                  setPicked(date);
                  writeDateInput(carrier.current, date);
                  setOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
        </InputGroup>
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

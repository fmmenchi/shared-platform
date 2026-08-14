import { useRef, useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormDateInput } from './form-date-input.component.js';
import { Calendar } from '../calendar/calendar.component.js';
import { Popover } from '../popover/popover.component.js';
import { PopoverTrigger } from '../popover-trigger/popover-trigger.component.js';
import { PopoverContent } from '../popover-content/popover-content.component.js';
import { UiProvider } from '../../i18n/provider.js';
import { formatIsoDate } from '../../date/civil-date.js';
import type { UseFormField } from '../../form/form-adapter.types.js';
import type { CivilDate } from '../../date/civil-date.types.js';

/**
 * A hand-written adapter, so the stories name no form library — which is also
 * the point: neither does the component.
 *
 * Note what it reads: `event.target.value`, straight off the carrier. There is
 * no delegation here and no group-shaped special case, because the field really
 * does have one input holding one value.
 */
function DemoForm({ children }: { children: ReactNode }) {
  const [values, setValues] = useState<Record<string, string>>({
    dob: '',
    start: '',
  });
  const useDemoField: UseFormField = (name) => ({
    control: {
      name,
      onChange: (event) => {
        const el = event.target as HTMLInputElement;
        setValues((v) => ({ ...v, [name]: el.value }));
      },
    },
    errors:
      name === 'start' && values.start === ''
        ? ['Enter the day you start.']
        : [],
  });
  return (
    <div
      style={{
        display: 'grid',
        gap: 'var(--fm-space-stack-m)',
        maxWidth: '26rem',
      }}
    >
      <UiProvider
        adapters={{ i18n: { locale: 'en' }, form: { field: useDemoField } }}
      >
        {children}
      </UiProvider>
      <output style={{ font: 'var(--fm-font-mono, monospace)', opacity: 0.7 }}>
        {JSON.stringify(values)}
      </output>
    </div>
  );
}

const meta = {
  title: 'Components/Form adapters/FormDateInput',
  component: FormDateInput,
  parameters: {
    docs: {
      description: {
        component:
          'A bound `DateInput`: the label, the field, the hint and the errors in one tag. One text field, so a `<label>` names it — there is no `Fieldset` and no legend, which belong to controls that are a group.',
      },
    },
  },
} satisfies Meta<typeof FormDateInput>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One tag per field, and nothing names a form library. */
export const Default: Story = {
  args: { name: 'dob', label: 'Date of birth' },
  render: (args) => (
    <DemoForm>
      <FormDateInput {...args} />
    </DemoForm>
  ),
};

/**
 * THE PICKER, BOUND — and the wiring is not the one `Calendar`'s own story
 * shows, deliberately.
 *
 * Unbound, the calendar reaches the carrier itself: `carrierRef` hands you the
 * node and `writeDateInput` writes it. `FormDateInput` omits `carrierRef`,
 * because that ref is the binding's — a library reading `.value` off the wrong
 * node stores `12/08/2026` where it wanted an ISO date.
 *
 * So here the calendar hands the ISO to the **form library**, which is the one
 * that owns the value, and the field repaints itself. That is not a courtesy:
 * `setValue` and `reset` ASSIGN onto the element they hold a ref to, firing no
 * event and — for a binding that only registers — triggering no render either.
 * `DateInput` wraps its carrier's `value` descriptor precisely so that an
 * assignment nobody announces still redraws what the user is looking at.
 */
export const WithACalendar: Story = {
  args: { name: 'departure', label: 'Departure' },
  render: function PickerFormStory(args) {
    // ONE ref, passed as an object rather than a callback: this is the ref the
    // library would hold, and `FormDateInput` routes it to the carrier.
    const carrier = useRef<HTMLInputElement>(null);
    const [stored, setStored] = useState('');
    const [open, setOpen] = useState(false);
    const [picked, setPicked] = useState<CivilDate | null>(null);
    // The month is the composition's too, and for the same reason: a date typed
    // in another month would otherwise open a grid that does not draw it.
    const [month, setMonth] = useState<CivilDate>(() => {
      const now = new Date();
      return { year: now.getFullYear(), month: now.getMonth() + 1, day: 1 };
    });
    const take = (date: CivilDate | null) => {
      setPicked(date);
      if (date !== null) setMonth(date);
    };

    const useDemoField: UseFormField = (name) => ({
      control: {
        name,
        ref: carrier,
        onChange: (event) =>
          setStored((event.target as HTMLInputElement).value),
      },
      errors: [],
    });

    // What `setValue(name, iso)` does, written out: assign onto the node the
    // binding holds. No event is dispatched here, on purpose — the point of the
    // story is that the field follows anyway.
    const setValue = (date: CivilDate | null) => {
      const node = carrier.current;
      const iso = date === null ? '' : formatIsoDate(date);
      if (node === null || iso === null) return;
      node.value = iso;
      setStored(iso);
    };

    return (
      <div
        style={{
          display: 'grid',
          gap: 'var(--fm-space-stack-m)',
          maxWidth: '26rem',
        }}
      >
        <UiProvider
          adapters={{ i18n: { locale: 'en' }, form: { field: useDemoField } }}
        >
          <div
            style={{
              display: 'flex',
              gap: 'var(--fm-space-inline-s)',
              alignItems: 'end',
            }}
          >
            <div style={{ flex: 1 }}>
              {/* The return path, and the recipe is wrong without it: a date
                  TYPED into the field has to reach the calendar too, or
                  reopening the popover highlights the day chosen three edits
                  ago. `onDateChange` is not the binding's — it reports the
                  parsed day, where `onChange` reports the DOM event. */}
              <FormDateInput {...args} onDateChange={take} />
            </div>
            <Popover open={open} onOpenChange={setOpen} placement="bottom-end">
              <PopoverTrigger
                variant="secondary"
                aria-label="Pick from a calendar"
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
                    setValue(date);
                    setOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </UiProvider>
        <output
          style={{ font: 'var(--fm-font-mono, monospace)', opacity: 0.7 }}
        >
          {JSON.stringify({ departure: stored })}
        </output>
      </div>
    );
  },
};

/** The hint sits before the errors, however many of them there are. */
export const WithHintAndError: Story = {
  args: {
    name: 'start',
    label: 'Start date',
    hint: 'The first day you will be working.',
  },
  render: (args) => (
    <DemoForm>
      <FormDateInput {...args} />
    </DemoForm>
  ),
};

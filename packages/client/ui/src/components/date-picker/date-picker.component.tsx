import { useRef, useState } from 'react';
import { DateInput } from '../date-input/date-input.component.js';
import { InputGroup } from '../input-group/input-group.component.js';
import { Popover } from '../popover/popover.component.js';
import { PopoverTrigger } from '../popover-trigger/popover-trigger.component.js';
import { PopoverContent } from '../popover-content/popover-content.component.js';
import { Calendar } from '../calendar/calendar.component.js';
import { CalendarGlyph } from './calendar-glyph.component.js';
import { useMessages } from '../../i18n/provider.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { parseIsoDate } from '../../date/civil-date.js';
import { writeDateInput } from '../../date/write-date-input.js';
import { startOfMonth } from '../../date/civil-math.js';
import { datePickerMessages } from './date-picker.messages.js';
import type { DatePickerProps } from './date-picker.types.js';
import type { CivilDate } from '../../date/civil-date.types.js';

/** Today, as a day rather than an instant. */
function today(): CivilDate {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
}

/**
 * A date field with a calendar behind it.
 *
 *     <DatePicker name="departure" aria-label="Departure" />
 *
 * WHY IT EXISTS, given that its three parts are all exported and could be
 * assembled by hand: because they were, and the assembly has five steps that
 * each fail silently when missed (ADR-0027's amendment lists them). Three of the
 * five were got wrong by the people who wrote the parts, on first assembly, in
 * one afternoon. This component is those five steps, once.
 *
 * WHAT IT OWNS is three pieces of state with three different owners, and that
 * split is the design rather than an accident:
 *
 * - **the date lives in the DOM**, on the carrier, as it does for every control
 *   in this package (ADR-0013) — so `FormData`, `form.reset()` and a form
 *   library all still see exactly one ordinary field;
 * - **the highlight lives in React**, because a grid has no DOM home for a
 *   selected day;
 * - **the shown month lives in React too**, and it is the piece a hand-written
 *   composition forgets: a date typed in December 2027 lands on a day an August
 *   grid does not draw, and the popover then opens showing nothing selected.
 *
 * WHAT IT IS NOT is a wrapper that hides its parts. `DateInput`, `Calendar` and
 * `Popover` stay exported and stay documented; anything this does not offer —
 * a controlled open state, a second trigger, a calendar somewhere other than a
 * popover — is still assembled by hand exactly as before.
 */
function DatePicker(props: DatePickerProps) {
  const {
    isDateDisabled,
    defaultMonth,
    firstDayOfWeek,
    placement = 'bottom-end',
    icon,
    triggerLabel,
    carrierRef,
    defaultDate,
    defaultValue,
    onDateChange,
    ...field
  } = props;
  const t = useMessages(datePickerMessages);
  const carrier = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);

  // SEEDED FROM THE FIELD'S OWN SEED, so the calendar opens on the day already
  // in the box rather than on today. `defaultDate` is the parsed form and
  // `defaultValue` the ISO one; the field takes either, so this reads either.
  const [picked, setPicked] = useState<CivilDate | null>(
    () => defaultDate ?? (defaultValue ? parseIsoDate(defaultValue) : null),
  );
  const [month, setMonth] = useState<CivilDate>(() =>
    startOfMonth(
      defaultMonth ??
        defaultDate ??
        (defaultValue ? parseIsoDate(defaultValue) : null) ??
        today(),
    ),
  );

  // THE RETURN PATH. What is typed has to reach the grid — otherwise reopening
  // the popover highlights the day chosen three edits ago — and it has to take
  // the month with it, or that highlight is on a day the grid does not draw.
  const take = (date: CivilDate | null) => {
    setPicked(date);
    if (date !== null) setMonth(startOfMonth(date));
    onDateChange?.(date);
  };

  return (
    <InputGroup>
      <DateInput
        {...field}
        defaultDate={defaultDate}
        defaultValue={defaultValue}
        // OURS AND THE CALLER'S: the picker needs this node to write the field,
        // and taking it away from a consumer who also needs it would close a
        // door for no reason.
        //
        // `mergeRefs` is BUILT INSIDE the callback rather than during render,
        // which is the same primitive `DateInput` uses one level down and not
        // the same position. The compiler allows that call under a `ref` prop
        // and refuses it under any other — "passing a ref to a function may read
        // its value during render" — and the distinction is a real one:
        // `carrierRef` is an ordinary prop that happens to carry a ref. Deferred
        // to attach time, every read and write lands where it belongs.
        carrierRef={(node) => mergeRefs(carrier, carrierRef)(node)}
        onDateChange={take}
      />
      <Popover open={open} onOpenChange={setOpen} placement={placement}>
        {/* `PopoverTrigger` IS a `Button`. Nesting one inside it would be two
            interactive controls in one place — `nested-interactive` to axe, and
            two tab stops for one affordance to everybody else. */}
        {/* THE GLYPH GOES THROUGH `icon`, NOT THROUGH CHILDREN, and the
            difference is visible rather than stylistic: `Button` derives
            `isIconOnly` from an `icon` with no renderable children, and only
            then squares itself and drops its horizontal padding. Passed as a
            child, the same glyph left a `px-4` rectangle whose hover fill was a
            wide pale block inside the field's rounded border — which is exactly
            what it looked like. `sm` keeps it a hair shorter than the control,
            so the row centres it and the group's border stays clear of it. */}
        <PopoverTrigger
          variant="ghost"
          size="sm"
          icon={icon ?? <CalendarGlyph />}
          disabled={field.disabled}
          aria-label={triggerLabel ?? t('trigger')}
        />
        <PopoverContent>
          <Calendar
            value={picked}
            month={month}
            onMonthChange={setMonth}
            isDateDisabled={isDateDisabled}
            firstDayOfWeek={firstDayOfWeek}
            onValueChange={(date) => {
              setPicked(date);
              setMonth(startOfMonth(date));
              // THE FIELD IS SET, NOT REPLACED — and written the way a keystroke
              // writes it: the prototype setter, so React's value tracker is
              // left stale and hears the change, then a bubbling `input` event,
              // so the field redraws in the locale's order and a form binding
              // learns about it. A plain `.value =` would update the DOM and
              // tell nobody.
              writeDateInput(carrier.current, date);
              // REPORTED FROM HERE, and it has to be. `DateInput` raises
              // `onDateChange` from the VISIBLE field's own change handler —
              // the one that runs the mask — so a write that arrives on the
              // carrier repaints the field and reaches a form binding, but
              // never passes through it. Left to `take`, choosing a day from
              // the grid would have told the consumer nothing at all.
              onDateChange?.(date);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </InputGroup>
  );
}

export { DatePicker };

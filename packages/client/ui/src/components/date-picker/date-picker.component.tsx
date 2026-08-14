import { useEffect, useMemo, useRef, useState } from 'react';
import { DateInput } from '../date-input/date-input.component.js';
import { InputGroup } from '../input-group/input-group.component.js';
import { Popover } from '../popover/popover.component.js';
import { PopoverTrigger } from '../popover-trigger/popover-trigger.component.js';
import { PopoverContent } from '../popover-content/popover-content.component.js';
import { Calendar } from '../calendar/calendar.component.js';
import { CalendarGlyph } from './calendar-glyph.component.js';
import { useMessages } from '../../i18n/provider.js';
import { useFormatter } from '../../formatting/use-formatter.js';
import { cn } from '../../util/cn.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { parseIsoDate } from '../../date/civil-date.js';
import { writeDateInput } from '../../date/write-date-input.js';
import { startOfMonth } from '../../date/civil-math.js';
import { datePickerMessages } from './date-picker.messages.js';
import type { DatePickerProps } from './date-picker.types.js';
import styles from './date-picker.module.css';
import type { CivilDate } from '../../date/civil-date.types.js';

/**
 * A `CivilDate` as the instant `Intl` needs, built the long way round:
 * `Date.UTC(99, …)` means 1999, and a year under 100 is a real date to enter.
 */
function utc({ year, month, day }: CivilDate): Date {
  const at = new Date(0);
  at.setUTCFullYear(year, month - 1, day);
  at.setUTCHours(0, 0, 0, 0);
  return at;
}

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
 * one afternoon. This component performs the first four and ABOLISHES the
 * fifth: `FormDatePicker` renders the field itself, so it holds the carrier
 * alongside the binding's ref and needs no library lever at all.
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
    pickOnly = false,
    carrierRef,
    defaultDate,
    defaultValue,
    onDateChange,
    ...field
  } = props;
  const t = useMessages(datePickerMessages);
  const formatter = useFormatter();
  /** A whole date, spoken rather than written — the same shape a cell's own
   *  accessible name takes, so the confirmation matches what was activated. */
  const longDate = useMemo(
    () =>
      new Intl.DateTimeFormat(formatter.locale, {
        dateStyle: 'long',
        timeZone: 'UTC',
        calendar: 'gregory',
      }),
    [formatter.locale],
  );
  const carrier = useRef<HTMLInputElement>(null);
  const visible = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  // `pickOnly` FLIPS WHICH SURFACE OPENS IT, and the reasoning is: a field that
  // can be typed into has a caret to protect, so the trigger is a separate
  // target; a field that cannot has nothing to protect, so the whole field is
  // the target. Several widely used pickers appear to split the same way, but
  // that is recollection rather than anything this repository can check, so it
  // is not cited as evidence.
  //
  // IT IS A PROP OF OURS RATHER THAN THE PLATFORM'S `readonly`, and the first
  // version got that wrong. `readonly` is not "you cannot type here", it is
  // "the user cannot modify this value" — and the trigger beside it modifies
  // it, so the state exposed to assistive technology was false (WCAG 4.1.2).
  // A reader was told the date was fixed while a button next to it changed it.
  //
  // So the typing is refused at `beforeinput`, which stops every route into the
  // value — keystroke, paste, drop, dictation — without claiming immutability,
  // and the field says what it really is instead: a textbox that opens a
  // dialog. `readOnly` stays available and now means what it says; a field the
  // consumer really has frozen disables the trigger too, below.
  const frozen = field.readOnly === true || field.disabled === true;
  const asTrigger = pickOnly && !frozen;

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

  // WHAT THE READER IS TOLD WHEN A DAY IS CHOSEN. Closing the popover hands
  // focus back to whatever opened it, and a trigger's name does not change —
  // so the whole announcement was "Choose from a calendar, button, collapsed",
  // with the date said nowhere. Measured: the typeable and the pick-only modes
  // gave opposite experiences for the same action, because one happened to
  // restore focus to the field and the other to the button.
  //
  // Only for a day CHOSEN FROM THE GRID. A date being typed is already being
  // read back keystroke by keystroke, and announcing each intermediate value
  // would talk over the person typing it.
  // THE TYPING IS REFUSED ON THE NATIVE EVENT, not React's synthetic one.
  // `beforeinput` is the single door every route into a value passes through —
  // keystroke, paste, drop, dictation, autofill — so cancelling it stops all of
  // them while saying nothing about whether the value can change, which it can.
  //
  // React's `onBeforeInput` does NOT get there: measured, dispatching a real
  // cancelable `beforeinput` with `inputType: 'insertFromPaste'` came back
  // uncancelled, because the synthetic event is its own polyfilled thing rather
  // than a subscription to this one. A native listener is the only version that
  // actually refuses a paste.
  useEffect(() => {
    const element = visible.current;
    if (element === null || !asTrigger) return;
    const refuse = (event: Event) => event.preventDefault();
    element.addEventListener('beforeinput', refuse);
    return () => element.removeEventListener('beforeinput', refuse);
  }, [asTrigger]);

  const announce = (date: CivilDate) => {
    setAnnouncement(t('picked', { date: longDate.format(utc(date)) }));
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
        className={cn(asTrigger && styles.asTrigger, field.className)}
        // WHAT IT REALLY IS, said out loud. A textbox that opens a dialog, so a
        // reader who lands on it is told there is something to open rather than
        // meeting a box that silently ignores every key.
        // The `gg/mm/aaaa` hint is an instruction, and this field refuses it.
        announceFormat={!asTrigger}
        // `aria-haspopup` ONLY, and not `aria-expanded` beside it. The pair
        // belongs to `role="combobox"`, and axe is right to refuse the second
        // on a textbox: taking the role would promise arrow-key navigation into
        // the popup and a value relationship with it, which this does not have.
        // The open state is on the trigger, where it is both allowed and true.
        aria-haspopup={asTrigger ? 'dialog' : undefined}
        ref={(node) => mergeRefs(visible, field.ref)(node)}
        // AND IT OPENS FROM THE KEYBOARD. A field styled and behaving as a
        // button while answering no key is an affordance a keyboard user can
        // see and not use; the trigger keeps the function reachable, but this is
        // the surface they are on. ArrowDown joins Enter and Space because it is
        // what every popup-bearing control in this package answers.
        onKeyDown={(event) => {
          field.onKeyDown?.(event);
          if (!asTrigger || event.defaultPrevented) return;
          if (
            event.key === 'Enter' ||
            event.key === ' ' ||
            event.key === 'ArrowDown'
          ) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        // CHAINED, not replaced: a consumer's own click on the field is theirs.
        //
        // AND NO GUARD AGAINST THE SECOND CLICK, which is worth a sentence
        // because the obvious reading says it needs one. Clicking the field
        // while the calendar is open light-dismisses it on the POINTERDOWN, and
        // the `setOpen(true)` below then runs on a popover the platform has
        // already closed — which looks like it would re-open what the user was
        // closing. It does not: this handler runs before the surface reports
        // its `toggle`, so the state it writes is the one already held, and the
        // dismissal lands last. Measured with the guard removed — the calendar
        // still closes — so the guard was machinery for a defect that is not
        // there.
        onClick={(event) => {
          field.onClick?.(event);
          if (asTrigger) setOpen(true);
        }}
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
            what it looked like.

            `sm` IS PINNED, and the size the caller gives the FIELD does not
            reach it. Measured, group height against trigger height: sm 32/32,
            md 36/32, lg 44/32 — so the trigger is level with the field at `sm`
            and 12px short at `lg`, and under a coarse pointer `Button` raises
            `sm` to 44 while `Input` raises only `md`, making them level again.
            Following the field's size would put a full-height button inside the
            border at three of those combinations; a fixed small one is the only
            choice that never draws a block the width of the field. What it
            costs is stated rather than hidden: in a large field the trigger is
            noticeably smaller than the box around it. */}
        <PopoverTrigger
          variant="ghost"
          size="sm"
          icon={icon ?? <CalendarGlyph />}
          // FROZEN WITH THE FIELD. `readOnly` means the user cannot modify the
          // value, so a trigger that still opened would be a way to change what
          // was declared unchangeable — the defect `pickOnly` exists to avoid,
          // arriving through the other door.
          disabled={frozen}
          aria-label={triggerLabel ?? t('trigger')}
        />
        {/* THE SURFACE NEEDS A NAME OF ITS OWN, and axe structurally cannot
            say so: its `aria-dialog-name` rule selects `[role="dialog"]`, an
            ATTRIBUTE, so a native `<dialog>` is never evaluated. Measured —
            0 violations as shipped, 1 the moment the role is spelled out on the
            same element. Without this a reader who opens the calendar hears
            "dialog" and nothing else.

            Named for what it is rather than with a heading, because the only
            heading a calendar could carry is the month caption, which the grid
            already uses as its own name — a second one would announce the month
            twice and say nothing about why the surface is open. */}
        <PopoverContent
          aria-label={triggerLabel ?? t('trigger')}
          className={styles.surface}
        >
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
              // AND NOT REPORTED FROM HERE. `DateInput` now raises
              // `onDateChange` for a write that arrives on the carrier too, so
              // this reaches the consumer through `take` — the same door a
              // keystroke uses — and reporting again beside it would announce
              // one choice twice.
              writeDateInput(carrier.current, date);
              announce(date);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      {/* Polite, and outside the popover on purpose: a region inside a surface
          that is closing as the message arrives is a region a reader may never
          be given. */}
      <span aria-live="polite" className={styles.announcement}>
        {announcement}
      </span>
    </InputGroup>
  );
}

export { DatePicker };

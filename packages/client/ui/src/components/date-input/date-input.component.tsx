import { Input } from '../input/input.component.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { formatIsoDate, parseIsoDate } from '../../date/civil-date.js';
import type { DateInputProps } from './date-input.types.js';

/**
 * A date field on the platform's own date input, styled by the design system.
 *
 * It is `<Input type="date">` and adds one thing: the value read back as the
 * day it names. The field itself needed no help — measured, `Input` already
 * lines a date up with a text field to the pixel (36px against 36px), carries
 * the tokens, wires into `Field`, reports `rangeUnderflow` from `min`/`max`,
 * and comes back from `form.reset()`. What it could not do is hand a consumer
 * anything but a string, and the obvious way to convert one is a defect:
 * `new Date('2026-08-12')` is the 11th of August anywhere west of Greenwich.
 *
 * So the DOM keeps the ISO string — the browser holds control state here, as
 * everywhere in this package — and `onDateChange` runs beside `onChange` with
 * a `{ year, month, day }` that no timezone can move.
 *
 * The picker itself stays the engine's: it cannot be styled, in any browser,
 * and on touch it is the OS sheet, which is better than anything we would draw
 * (ADR-0027). Per-date disabling is not on offer — `min`/`max` are an interval,
 * not a set. That is what `Calendar` is for.
 */
function DateInput(props: DateInputProps) {
  const { onDateChange, defaultDate, defaultValue, onChange, ...rest } = props;

  // `defaultDate` is sugar over `defaultValue`, so an explicit `defaultValue`
  // still wins — the same precedence every component here gives the call site.
  const seeded =
    defaultDate === undefined ? undefined : formatIsoDate(defaultDate);
  const seed = defaultValue ?? seeded ?? undefined;

  // SAY SO rather than start empty. `formatIsoDate` refuses a day that does not
  // exist — which is right, since inventing the 2nd of March out of the 30th of
  // February is the defect next door — but a field that silently ignores the
  // seed it was given is the kind of quiet failure that gets debugged twice.
  useDevWarning(
    defaultDate !== undefined && seeded === null,
    `DateInput: \`defaultDate\` ${JSON.stringify(defaultDate)} does not name a day that exists, so the field starts empty. Months are 1-12 and the year is four digits.`,
  );

  return (
    <Input
      {...rest}
      type="date"
      defaultValue={seed}
      onChange={(event) => {
        // The consumer's own handler first and unconditionally: this wraps the
        // event, it does not intercept it.
        onChange?.(event);
        onDateChange?.(parseIsoDate(event.currentTarget.value));
      }}
    />
  );
}

export { DateInput };

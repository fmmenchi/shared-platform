import type { ComponentProps, Ref } from 'react';
import type { Input } from '../input/input.component.js';
import type { CivilTime, TimePrecision } from '../../date/civil-time.types.js';
import type { HourCycle } from '../../date/civil-time.js';

/** The parts a clock reading is typed in, named as `Intl` names them. */
export type TimePart = 'hour' | 'minute' | 'second';

interface TimeInputOwnProps {
  /**
   * The field name. It lands on the CARRIER, so `FormData` gets one entry
   * holding `HH:mm` — or `HH:mm:ss` at second precision — and never `02:30 PM`,
   * which no server should have to know the locale of.
   */
  name?: string;
  /**
   * The starting value as `HH:mm` or `HH:mm:ss`. Uncontrolled, like every
   * control here: the DOM keeps it from then on, which is what makes
   * `form.reset()` work (ADR-0013). It is DISPLAYED in the declared locale's
   * hour cycle, so the same `14:30` reads `14:30` under `it` and `02:30 PM`
   * under `en-US`.
   */
  defaultValue?: string;
  /**
   * The starting value as a clock reading. Sugar over `defaultValue`, which
   * wins if you pass both. A triple that names no time (`{ hour: 24 }`) leaves
   * the field empty and says so in development rather than inventing midnight.
   */
  defaultTime?: CivilTime;
  /**
   * The value read back as the time it names — `null` while what is typed does
   * not yet name one.
   *
   * There is deliberately no `time` prop to go with it, for the reason
   * `DateInput` has no `date`: holding the value in React is what breaks
   * `form.reset()`, and it would fight the user mid-edit.
   */
  onTimeChange?: (time: CivilTime | null) => void;
  /**
   * Whether the field carries seconds. `'minute'` by default, because most
   * times a person types are to the minute and a field that always posted `:00`
   * would claim a precision it was never given.
   */
  precision?: TimePrecision;
  /**
   * Force the hour cycle instead of taking the locale's.
   *
   * The default is the right answer nearly always: `en-US` reads twelve-hour,
   * `it` and `ja` read twenty-four, and a field that disagreed with the `Time`
   * beside it is the whole defect ADR-0027 exists to remove. The override is
   * for the cases the locale cannot know — a hospital or a timetable that reads
   * twenty-four-hour whatever the page's language — and it takes the four
   * cycles `Intl` reports, `h11`/`h12` being the ones with a day period.
   */
  hourCycle?: HourCycle;
  /**
   * A ref to the CARRIER — the node holding the `HH:mm` value under `name`.
   *
   * For form libraries, and `FormTimeInput` is the one that uses it: a
   * binding's ref has to reach the element whose `value` is the field's value,
   * and given the visible field it would read `02:30 PM`.
   */
  carrierRef?: Ref<HTMLInputElement>;
  /**
   * Whether to tell assistive technology the format to type in — `hh:mm`,
   * `hh:mm AM/PM` — as a placeholder and as part of the field's description.
   *
   * On by default, and forced OFF by `readOnly`, because the hint is an
   * INSTRUCTION: telling a reader to write something into a control that
   * refuses it is worse than saying nothing.
   */
  announceFormat?: boolean;
}

/**
 * Public `TimeInput` props — every native `<input>` attribute, plus the seven
 * above.
 *
 * It is one text field, so it composes exactly as `Input` does: a `Field` names
 * it and wires `aria-describedby`/`aria-invalid`, `ref` reaches the input, and
 * `FormTimeInput` is its bound twin.
 */
export type TimeInputProps = TimeInputOwnProps &
  Omit<
    ComponentProps<typeof Input>,
    keyof TimeInputOwnProps | 'type' | 'defaultValue'
  >;

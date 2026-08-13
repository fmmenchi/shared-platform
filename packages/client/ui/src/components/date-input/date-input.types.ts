import type { ComponentProps } from 'react';
import type { Input } from '../input/input.component.js';
import type { CivilDate } from '../../date/civil-date.types.js';

/** The three parts, named as `Intl.DateTimeFormat` names them. */
export type DatePart = 'day' | 'month' | 'year';

interface DateInputOwnProps {
  /**
   * The field name. It lands on the CARRIER, so `FormData` gets one entry
   * holding an ISO `YYYY-MM-DD` — never the localised text the user typed,
   * which no server should have to guess the locale of.
   */
  name?: string;
  /**
   * The starting value as ISO `YYYY-MM-DD`. Uncontrolled, like every control
   * here: the DOM keeps it from then on, which is what makes `form.reset()`
   * work (ADR-0013). It is DISPLAYED in the declared locale's order.
   */
  defaultValue?: string;
  /**
   * The starting value as a day. Sugar over `defaultValue`, which wins if you
   * pass both. A triple that names no day (`2026-02-30`) leaves the field empty
   * and says so in development rather than inventing 2 March.
   */
  defaultDate?: CivilDate;
  /**
   * The value read back as the day it names — `null` while what is typed does
   * not yet name one, and `null` for a date that does not exist.
   *
   * There is deliberately no `date` prop to go with it. Holding the value in
   * React is what breaks `form.reset()`, and it would fight the user mid-edit:
   * a date is unparseable for as long as it takes to type one.
   */
  onDateChange?: (date: CivilDate | null) => void;
}

/**
 * Public `DateInput` props — every native `<input>` attribute, plus the four
 * above.
 *
 * It is one text field, so it composes exactly as `Input` does: a `Field` names
 * it and wires `aria-describedby`/`aria-invalid`, `ref` reaches the input, and
 * `FormDateInput` is its bound twin the way `FormInput` is `Input`'s.
 *
 * `placeholder` defaults to the format hint in the declared locale's order —
 * `gg/mm/aaaa`, `mm/dd/yyyy` — and can be replaced like any other.
 */
export type DateInputProps = DateInputOwnProps &
  Omit<
    ComponentProps<typeof Input>,
    keyof DateInputOwnProps | 'type' | 'defaultValue'
  >;

import type { ComponentProps, Ref } from 'react';
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
  /**
   * A ref to the CARRIER — the node holding the ISO value under `name`.
   *
   * For form libraries, and `FormDateInput` is the one that uses it. A binding's
   * ref has to reach the element whose `value` is the field's value, which is
   * this one and not the visible field: react-hook-form's `register()` reads
   * `.value` off the element it was handed, and given the visible field it
   * would read `12/08/2026` where the form wants `2026-08-12`.
   *
   * Plain `ref` still reaches the visible input, which is where focus belongs.
   */
  carrierRef?: Ref<HTMLInputElement>;
  /**
   * Whether to tell assistive technology the format to type in — `gg/mm/aaaa`,
   * `mm/dd/yyyy` — as a placeholder and as part of the field's description.
   *
   * On by default, and forced OFF by `readOnly`, because the hint is an
   * INSTRUCTION: telling a reader to write something into a control that
   * refuses it is worse than saying nothing. It is a prop as well as a
   * derivation because a field can be un-typeable without being read-only —
   * `DatePicker`'s `pickOnly`, which refuses input at `beforeinput` rather than
   * claiming the value is fixed.
   */
  announceFormat?: boolean;
  /**
   * Whether the field tells the platform that text naming NO date makes it an
   * invalid control — so the browser refuses the submit and says why.
   *
   * On by default, and it closes a real hole: the visible input holds text, so
   * `required` is satisfied, while the carrier that holds the value is
   * deliberately not `required` itself. Measured without it: a half-typed `12/08/` typed
   * into a `required` field gave `validity.valueMissing` false,
   * `checkValidity()` true, and a form posting an empty string with no signal of
   * any kind. It is what the native control this replaces does with the same
   * keystrokes — a partially filled one reports `badInput` and the browser stops
   * there.
   *
   * Turn it OFF for a field whose validation belongs entirely to a schema, so
   * the only message the reader gets is that one. A whole form can be excused at
   * once with `noValidate`, but that also silences `required` on every plain
   * `Input` beside it, which is why this exists per field.
   */
  validateIncomplete?: boolean;
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

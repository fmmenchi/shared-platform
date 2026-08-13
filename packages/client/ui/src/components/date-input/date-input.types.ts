import type { ComponentProps } from 'react';
import type { Input } from '../input/input.component.js';
import type { CivilDate } from '../../date/civil-date.types.js';

interface DateInputOwnProps {
  /**
   * The day the user picked, parsed — `null` while the field is empty or
   * mid-edit and does not yet name a day.
   *
   * This runs BESIDE `onChange`, never instead of it: the DOM keeps the ISO
   * string, so uncontrolled use, `form.reset()` and every form library keep
   * working exactly as they do on `Input`. What this adds is the reading, and
   * the reason it is worth adding is that the obvious way to do it by hand —
   * `new Date(event.target.value)` — is wrong in every timezone west of
   * Greenwich. Measured in `America/Lima`: for `2026-08-12` it answers the
   * 11th.
   */
  onDateChange?: (date: CivilDate | null) => void;
  /**
   * The initial day, as a day rather than as a string. Uncontrolled, like
   * `defaultValue`, which it becomes — there is deliberately no controlled
   * `date` twin, because holding the value in React is what breaks
   * `form.reset()` (measured, and the reason `Input` does not do it either).
   */
  defaultDate?: CivilDate;
}

/**
 * A native date field. Everything `Input` takes, minus `type` — which is the
 * whole of what this fixes — plus a way to read the value as a date.
 */
export type DateInputProps = DateInputOwnProps &
  Omit<ComponentProps<typeof Input>, keyof DateInputOwnProps | 'type'>;

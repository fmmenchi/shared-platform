import { formatIsoDate } from './civil-date.js';
import { setNativeValue } from '../primitives/set-native-value.js';
import type { CivilDate } from './civil-date.types.js';

/**
 * Set a `DateInput` from outside it — which is what "the calendar SETS the
 * field" means in ADR-0027, and what a `Calendar` inside a `Popover` does.
 *
 * Aimed at the node `DateInput`'s `carrierRef` gives you: the input holding the
 * ISO value under the field's `name`. Not the visible field, which holds the
 * date written the way the reader's locale writes it.
 *
 * WHY A FUNCTION AND NOT A PROP. `DateInput` is uncontrolled by contract — the
 * browser holds the value, as it does for every control in this package
 * (ADR-0013) — so there is no `value` to hand it, and `defaultValue` stops
 * reaching the DOM the moment the user has typed. Writing the DOM is therefore
 * the only honest way in, and this writes it exactly as a keystroke does: the
 * prototype setter, so React's value tracker is left stale and hears the
 * change, then a bubbling `input` event, so a form binding and the field itself
 * both learn about it.
 *
 * A `null` clears the field. Returns `false` when there is nothing to write to.
 */
export function writeDateInput(
  carrier: HTMLInputElement | null | undefined,
  date: CivilDate | null,
): boolean {
  if (carrier == null) return false;
  // A day that does not exist writes nothing rather than clearing the field:
  // the caller asked for something impossible, and emptying a form field is not
  // a reasonable guess at what they meant.
  const iso = date === null ? '' : formatIsoDate(date);
  if (iso === null) return false;
  return setNativeValue(carrier, iso);
}

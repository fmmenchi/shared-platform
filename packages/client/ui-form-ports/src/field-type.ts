import type { FormFieldType } from './field-type.types.js';

/** Controls whose state is `checked`, not `value`. */
export function isBooleanField(type: FormFieldType | undefined): boolean {
  return type === 'checkbox';
}

/**
 * The value to store for a control, read from the event target.
 *
 * A DOM value is always a string, so a controlled binding that just forwards
 * `target.value` puts `"31"` in the form state where the schema expects `31` —
 * the form then fails validation forever, with a message no amount of typing
 * fixes. Only `number` actually loses information that way, and it is exactly
 * the case the DOM gives us a lossless reading of.
 *
 * `date` is deliberately NOT converted: a date input's value already IS the
 * canonical `YYYY-MM-DD` string, so passing it on loses nothing. Turning it into
 * a `Date` would be a decision about time zones, and that belongs to the schema.
 *
 * Measured, because it is the obvious objection: coercing on every keystroke
 * does NOT destroy partial input. Typing `1.5` gives store values `1`, `1`,
 * `1.5` and the field shows `1.5` throughout — the browser keeps the partial
 * text while `valueAsNumber` is still NaN, and React never writes over it.
 */
export function readValue(
  type: FormFieldType | undefined,
  target: HTMLInputElement,
): unknown {
  if (isBooleanField(type)) return target.checked;
  if (type === 'number') {
    const value = target.valueAsNumber;
    // An empty or half-typed number reads as NaN. `undefined` is what "no value
    // yet" means to every schema; NaN would be a number that fails every rule.
    return Number.isNaN(value) ? undefined : value;
  }
  return target.value;
}

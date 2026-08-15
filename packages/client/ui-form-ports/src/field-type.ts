import type { FormFieldType } from './field-type.types.js';

/** Controls whose state is `checked`, not `value`. */
export function isBooleanField(type: FormFieldType | undefined): boolean {
  return type === 'checkbox';
}

/**
 * Fields drawn as MANY controls, and whether the field holds one value or a
 * list — the only thing an adapter needs to know to answer `checked` and to
 * write the next value.
 *
 * A group is not detected from the stored value, and that was measured rather
 * than assumed on the shape it would fail on: an empty `checkbox-group` holds
 * `[]` from a schema but `undefined` before anything is touched, and a
 * one-element one is indistinguishable from a scalar in an untyped store. Read
 * from the declared type, the answer does not depend on what the user has done
 * yet.
 */
export function isGroupField(type: FormFieldType | undefined): boolean {
  return type === 'radio' || type === 'checkbox-group';
}

/** A group whose value is a LIST — several options under one name. */
export function isMultipleField(type: FormFieldType | undefined): boolean {
  return type === 'checkbox-group';
}

/**
 * Is this option the chosen one? For a list, membership; for one-of-many,
 * equality against the string the DOM would carry.
 *
 * Compared as STRINGS on purpose. A stored `3` and an option's `"3"` are the
 * same option — the value came out of the DOM, where everything is a string —
 * and a strict comparison would render every numeric group permanently
 * unchecked. `readValue` undoes the coercion when the value is STORED; this is
 * the same problem read back the other way.
 */
export function isOptionChecked(
  stored: unknown,
  value: string,
  multiple: boolean,
): boolean {
  if (multiple) {
    return (
      Array.isArray(stored) && stored.some((item) => String(item) === value)
    );
  }
  return stored != null && String(stored) === value;
}

/** A field kind that IS one control — everything the per-field binding accepts. */
export type SingleFieldType = Exclude<
  FormFieldType,
  'radio' | 'checkbox-group'
>;

/**
 * The kind of a field bound through `UseFormField`, refusing the two that are
 * not one control.
 *
 * It throws, and the compiler asked for it rather than a reviewer: Conform
 * passes the declared type straight to `getInputProps`, so `'checkbox-group'`
 * — which is no `<input type>` at all — failed to typecheck the moment the two
 * members existed. That is the boundary being real instead of documented, and
 * the other three adapters get the same guard because for them the same mistake
 * is silent: a group declared and then bound one-control-per-field renders a
 * single control that can never report which option is checked, and the form
 * submits nothing while looking complete.
 *
 * A configuration error, deterministic and thrown on the first render, which is
 * the cheapest moment there is to find it.
 */
export function assertSingleField(
  name: string,
  type: FormFieldType | undefined,
): SingleFieldType | undefined {
  if (isGroupField(type)) {
    throw new Error(
      `@fmmenchi/ui-form-ports: field "${name}" is declared "${String(type)}", which is a field drawn as MANY controls — bind it with the option-field binding (createRhfOptionField, createFormikOptionField, createTanstackOptionField, createConformOptionField, useActionOptionField), not the per-field one.`,
    );
  }
  return type as SingleFieldType | undefined;
}

/**
 * The next value of a multiple group, read off the DOM the way the browser
 * itself would read it.
 *
 * THE ORDER IS DOCUMENT ORDER, and that was decided by the shared suite rather
 * than by preference. The first version appended in the order the reader
 * ticked, which is what a controlled library stores if left to itself — and it
 * disagreed with the three uncontrolled bindings, where nobody stores anything
 * and `FormData.getAll()` returns the checked inputs in the order they appear.
 * Measured: ticking "events" then "news" gave `['events','news']` through Formik
 * and TanStack and `['news','events']` through react-hook-form, Conform and
 * React 19. One port, two answers, decided by a library the consumer swapped —
 * which is the leak that suite exists to catch.
 *
 * So the controlled adapters ask the same question the browser answers: at the
 * moment a change event runs, the box has ALREADY been toggled, so the group's
 * checked inputs in `form.elements` order are the new value. Declaration order
 * is also the only order all five CAN produce — the uncontrolled three never see
 * a click at all.
 *
 * Falls back to the tick-order toggle when the control is outside a form, which
 * is the one case with no document to read.
 */
export function checkedInGroup(
  target: HTMLInputElement,
  name: string,
  stored: unknown,
  value: string,
): readonly string[] {
  const form = target.form;
  if (form == null) return toggleOption(stored, value, target.checked);
  return Array.from(form.elements)
    .filter(
      (element): element is HTMLInputElement =>
        element instanceof HTMLInputElement &&
        element.name === name &&
        element.type === 'checkbox' &&
        element.checked,
    )
    .map((element) => element.value);
}

/**
 * The next value after one option was toggled, appended in tick order — the
 * answer where there is no form to read (see {@link checkedInGroup}).
 */
export function toggleOption(
  stored: unknown,
  value: string,
  checked: boolean,
): readonly string[] {
  const current = Array.isArray(stored) ? stored.map(String) : [];
  if (!checked) return current.filter((item) => item !== value);
  return current.includes(value) ? current : [...current, value];
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

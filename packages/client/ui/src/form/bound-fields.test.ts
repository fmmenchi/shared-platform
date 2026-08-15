import { describe, it, expect } from 'vitest';
import { createBoundFields } from './bound-fields.js';

/**
 * The typed kit's own docstring says it holds **ALL** of the bound components —
 * "a kit that listed its own members would have gone stale the day
 * `FormTextarea` landed" — and it had gone stale by three by the time anybody
 * looked: `FormDatePicker`, `FormDateRangePicker` and `FormTimeInput` were all
 * exported from the package and all missing from the kit.
 *
 * What that costs a consumer is not a type error in the design system, it is a
 * type error in THEIR code: `const { FormTimeInput } = createBoundFields<…>()`
 * fails to compile, and in a JavaScript consumer it is `undefined`, which React
 * renders as "Element type is invalid".
 *
 * So the completeness is asserted rather than remembered. This reads the
 * package's own public surface, so a component added tomorrow fails here on the
 * day it lands rather than on the day somebody reaches for it.
 */
const surface = import.meta.glob('../components/form-*/index.ts', {
  eager: true,
}) as Record<string, Record<string, unknown>>;

/** Every `Form*` component the package ships, from its own folders. */
const shipped = new Set(
  Object.values(surface).flatMap((module) =>
    Object.keys(module).filter((name) => name.startsWith('Form')),
  ),
);

/**
 * `FormErrorSummary` is the one that does not belong: it is not a field and has
 * no `name` to narrow — it lists the errors of a whole form. The kit exists to
 * check a field's `name` against the form's shape, and a summary has none.
 */
const NOT_A_FIELD = new Set(['FormErrorSummary']);

describe('the typed kit holds every bound field', () => {
  it('found the components', () => {
    // A glob that silently matches nothing would make every assertion below
    // vacuous, which is the failure mode of every test written this way.
    expect(shipped.size).toBeGreaterThan(5);
    expect(shipped.has('FormInput')).toBe(true);
  });

  it('lists all of them, and nothing that is not a field', () => {
    const kit = new Set(Object.keys(createBoundFields()));
    const expected = [...shipped].filter((name) => !NOT_A_FIELD.has(name));

    expect([...kit].sort()).toEqual([...expected].sort());
  });

  it('hands back the components themselves, not wrappers', () => {
    // The factory re-types and does not wrap, which is what keeps identity
    // stable — calling it in a component body must remount nothing.
    const first = createBoundFields();
    const second = createBoundFields();
    for (const name of Object.keys(first) as (keyof typeof first)[]) {
      expect(first[name]).toBe(second[name]);
    }
  });
});

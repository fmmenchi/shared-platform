/**
 * COMPILE-TIME assertions on the `types` map — this package has no test
 * runner, and does not need one for this: the claim under test is what the
 * COMPILER accepts, so `tsc` (the `typecheck` target, which builds this spec
 * project) is the harness and `@ts-expect-error` is the assertion. A line that
 * stops erroring fails the build, exactly like a broken `expect`.
 *
 * What is pinned: given the form's values type, each adapter checks the map's
 * keys IN ITS OWN PATH SYNTAX — a misspelt key is a compile error rather than
 * a field quietly bound as text, and each library's array syntax is refused by
 * the other's adapter, which is the typo class the per-adapter path types
 * exist to stop. Without the values type, everything stays `string`-keyed and
 * compiles as before.
 */
import type { AnyFormApi } from '@tanstack/react-form';
import { createConformField } from './conform/index.js';
import { createFormikField } from './formik/index.js';
import { createRhfField } from './react-hook-form/index.js';
import { createTanstackField } from './tanstack/index.js';

interface Values {
  email: string;
  tos: boolean;
  count: number;
  guests: { name: string }[];
}

declare const form: AnyFormApi;

/* ---------- Typed: the keys are checked, in each adapter's syntax ---------- */

void createRhfField<Values>({
  types: { tos: 'checkbox', count: 'number', 'guests.0.name': 'text' },
});
void createFormikField<Values>({
  types: { tos: 'checkbox', 'guests.0.name': 'text' },
});
void createTanstackField<Values>(form, {
  types: { tos: 'checkbox', 'guests[0].name': 'text' },
});
void createConformField<Values>({
  types: { tos: 'checkbox', 'guests[0].name': 'text' },
});

/* ---------- A misspelt field name no longer compiles ---------- */

// @ts-expect-error — 'emial' is not a field of Values
void createRhfField<Values>({ types: { emial: 'email' } });
// @ts-expect-error — 'emial' is not a field of Values
void createFormikField<Values>({ types: { emial: 'email' } });
// @ts-expect-error — 'emial' is not a field of Values
void createTanstackField<Values>(form, { types: { emial: 'email' } });
// @ts-expect-error — 'emial' is not a field of Values
void createConformField<Values>({ types: { emial: 'email' } });

/* ---------- Each library's array syntax is refused by the others ---------- */

// @ts-expect-error — bracket rows are TanStack/Conform's syntax, not Formik's
void createFormikField<Values>({ types: { 'guests[0].name': 'text' } });
// @ts-expect-error — dotted rows are Formik's syntax, not Conform's
void createConformField<Values>({ types: { 'guests.0.name': 'text' } });

/* ---------- Without the values type, nothing narrows ---------- */

void createRhfField({ types: { anything: 'checkbox' } });
void createFormikField({ types: { anything: 'checkbox' } });
void createTanstackField(form, { types: { anything: 'checkbox' } });
void createConformField({ types: { anything: 'checkbox' } });

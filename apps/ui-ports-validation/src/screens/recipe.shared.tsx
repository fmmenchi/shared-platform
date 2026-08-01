import { z } from 'zod';
import { FormChoice, FormErrorSummary, FormInput } from '@fmmenchi/ui';

/* ─── recipe 2 — the schema ────────────────────────────────────────────────
   ONE schema, used by all four libraries. If any of them needed its own, the
   port would be leaking — so this file existing is itself part of the test.

   The MISSING case gets its own message because the libraries disagree on what
   they hand a validator for an empty field: Conform coerces it to `undefined`,
   the others pass `''`. A bare `z.string()` reports its own generic message for
   the former.
   ─────────────────────────────────────────────────────────────────────────── */
export const RecipeSchema = z.object({
  email: z
    .string({ message: 'Enter a valid email address.' })
    .email('Enter a valid email address.'),
  password: z
    .string({ message: 'Use at least 8 characters.' })
    .min(8, 'Use at least 8 characters.'),
  // A boolean, because these three libraries keep the form in JS STATE. Conform
  // is the exception and keeps its own schema: it validates FormData, where a
  // ticked box is the string `'on'` and an unticked one is absent entirely.
  // That difference belongs to the library, not to the port — the messages
  // still come out keyed by name.
  tos: z.literal(true, { message: 'You have to accept to continue.' }),
  // A NUMBER, not a string that looks like one. The DOM only ever hands back a
  // string, so this field is what proves the port undoes that loss — a schema
  // expecting a number is the ordinary case, and it would otherwise fail
  // forever with a message no amount of typing fixes.
  seats: z.number({ message: 'How many seats?' }).min(1, 'At least one seat.'),
});

export type RecipeValues = z.infer<typeof RecipeSchema>;

export const RECIPE_EMPTY = {
  email: '',
  password: '',
  tos: false,
  seats: undefined,
} as unknown as RecipeValues;

export const RECIPE_LABELS: Record<string, string> = {
  email: 'Email',
  password: 'Password',
  tos: 'Terms and conditions',
  seats: 'Seats',
};

/** The one field whose state is `checked` — the reason adapters take `types`. */
export const RECIPE_TYPES = { tos: 'checkbox', seats: 'number' } as const;

/* ─── recipe 1 — the fields ────────────────────────────────────────────────
   Written ONCE and rendered by every screen. Nothing here names a form
   library: that is the whole thing being validated. If two screens behave
   differently, the port has leaked.

   `constraints` is recipe 3: the rules as NATIVE attributes on the control.
   They pass straight through (the controls are transparent, ADR-0013), so the
   browser validates before any library runs — the same three lines whichever
   library is underneath, and they still work with JavaScript off.
   ─────────────────────────────────────────────────────────────────────────── */
/**
 * What the form sent, once it was allowed to send. Rendered by every screen so
 * the suite can assert that a valid submit actually REACHED the library —
 * without it, "no errors are showing" and "the form went through" look the
 * same from the outside.
 */
export function Submitted({ values }: { values: unknown }) {
  if (values == null) return null;
  return <output className="saved">Submitted: {JSON.stringify(values)}</output>;
}

export function RecipeFields({
  constraints = false,
}: {
  constraints?: boolean;
}) {
  return (
    <>
      <FormErrorSummary labelFor={(name) => RECIPE_LABELS[name] ?? name} />
      <FormInput
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        hint="We’ll only use it to sign you in."
        {...(constraints ? { required: true } : {})}
      />
      <FormInput
        name="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        {...(constraints ? { required: true, minLength: 8 } : {})}
      />
      <FormInput name="seats" label="Seats" type="number" />
      <FormChoice name="tos" label="I accept the terms and conditions" />
      <button type="submit">Create account</button>
    </>
  );
}

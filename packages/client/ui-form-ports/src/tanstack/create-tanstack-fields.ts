import { createBoundFields } from '@fmmenchi/ui';
import type { DeepKeys } from '@tanstack/react-form';
import type { BoundFields } from '@fmmenchi/ui';
import type { MissingFormValues } from './create-tanstack-fields.types.js';

/**
 * The bound components for ONE TanStack form shape, with every `name` checked
 * against the form's own fields.
 *
 *     // checkout.form.ts
 *     export const { FormInput, FormChoice } = createTanstackFields<CheckoutValues>();
 *
 *     <FormInput name="guests[0].name" label="Guest 1" />   // TanStack's syntax
 *     <FormInput name="guests.0.name" label="Guest 1" />    // does not compile
 *
 * Same call as the react-hook-form kit and the same argument — the VALUES type —
 * but the paths come out in TanStack's own syntax, because `DeepKeys` is what
 * derives them. That difference is the reason these live in the adapters.
 *
 * No `Form` here: this package ships a wrapper for react-hook-form only, since
 * TanStack's own `useForm` already is one.
 */
export function createTanstackFields<T = never>(): [T] extends [never]
  ? MissingFormValues
  : BoundFields<DeepKeys<T>> {
  return createBoundFields<DeepKeys<T>>() as [T] extends [never]
    ? MissingFormValues
    : BoundFields<DeepKeys<T>>;
}

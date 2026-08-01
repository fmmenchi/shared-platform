import { createBoundFields } from '@fmmenchi/ui';
import type { BoundFields } from '@fmmenchi/ui';
import type { FormikPath } from './formik-path.types.js';
import type { MissingFormValues } from './create-formik-fields.types.js';

/**
 * The bound components for ONE Formik form shape, with every `name` checked
 * against the form's own fields.
 *
 *     // signup.form.ts
 *     export const { FormInput, FormChoice } = createFormikFields<SignupValues>();
 *
 *     <FormInput name="guests.0.name" label="Guest 1" />
 *     <FormInput name="emial" label="Email" />   // does not compile
 *
 * Takes the VALUES type, like its siblings. The difference is where the paths
 * come from: Formik publishes no path type, so {@link FormikPath} derives them
 * here — in the adapter that knows how Formik resolves a name.
 */
export function createFormikFields<T = never>(): [T] extends [never]
  ? MissingFormValues
  : BoundFields<FormikPath<T>> {
  return createBoundFields<FormikPath<T>>() as [T] extends [never]
    ? MissingFormValues
    : BoundFields<FormikPath<T>>;
}

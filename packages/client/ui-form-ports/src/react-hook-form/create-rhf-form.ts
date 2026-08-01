import { createBoundFields } from '@fmmenchi/ui';
import type { FieldPath, FieldValues } from 'react-hook-form';
import { RhfForm } from './rhf-form.component.js';
import type { MissingFormValues, RhfFormKit } from './create-rhf-form.types.js';

/**
 * The form's wrapper and its bound components, with every `name` checked
 * against the form's own fields.
 *
 *     // signup.form.ts — beside the schema, outside any component
 *     export const { Form, FormInput, FormChoice } =
 *       createRhfForm<z.infer<typeof SignupSchema>>();
 *
 *     // signup-fields.tsx — another file, another component
 *     import { FormInput } from './signup.form.js';
 *     <FormInput name="emial" label="Email" />   // does not compile
 *
 * It takes the **values** type, never a path type: `FieldPath` stays inside
 * here, so nothing in the app imports react-hook-form to get a field named. The
 * same call on the TanStack adapter derives `DeepKeys` instead — which is why
 * this cannot live in the design system, where neither syntax is known.
 *
 * It takes no `defaultValues` either, and that is deliberate: real defaults come
 * from props or a request, so they are not available where this is called. This
 * carries the SHAPE; the data goes to the wrapper at render —
 * `<Form options={{ defaultValues, resolver }} onSubmit={…}>`.
 *
 * Declared at module level because that is the only thing a sub-component can
 * import: a type does not travel through React context (the context's own type
 * is fixed when it is created) and does not travel down the JSX tree, so an
 * import is what carries it across a file boundary.
 *
 * There is no runtime here beyond the object: the components come back as they
 * are, so their identity is stable across renders.
 */
export function createRhfForm<T extends FieldValues = never>(): [T] extends [
  never,
]
  ? MissingFormValues
  : RhfFormKit<T> {
  const kit = {
    Form: RhfForm,
    ...createBoundFields<FieldPath<T>>(),
  };
  return kit as [T] extends [never] ? MissingFormValues : RhfFormKit<T>;
}

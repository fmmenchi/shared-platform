import { FormInput } from '../components/form-input/form-input.component.js';
import { FormChoice } from '../components/form-choice/form-choice.component.js';
import { FormTextarea } from '../components/form-textarea/form-textarea.component.js';
import { FormSelect } from '../components/form-select/form-select.component.js';
import { FormSwitch } from '../components/form-switch/form-switch.component.js';
import type { BoundFields } from './bound-fields.types.js';

/**
 * The bound components with their `name` checked against the form's own field
 * names, instead of against `string`.
 *
 *     // once, beside the form's type
 *     const { FormInput } = createBoundFields<FieldPath<SignupValues>>();
 *
 *     <FormInput name="emial" label="Email" />
 *     //         ~~~~~~~~~~~~ not a field of SignupValues
 *
 * A misspelt name is the same failure as an unbound field — it renders, it
 * types, and it submits nothing — and it is the one the compiler is best placed
 * to catch, since the form's shape is already a type in the app.
 *
 * `Name` is the LIBRARY's path type, not one invented here: react-hook-form's
 * `FieldPath`, TanStack's `DeepKeys`, whatever the library offers. That matters
 * for arrays, where the syntax is the library's own — `items.0.title` for
 * react-hook-form, `items[0].title` for Conform — and a path type written here
 * would be wrong for half of them.
 *
 * A factory rather than a prop or a provider, because the type cannot travel
 * any other way: React context carries a VALUE, and the value's type is fixed
 * when the context is created, so no `<UiProvider>` can hand a per-form name
 * type to its descendants. Written once per form shape, at module level.
 *
 * There is no runtime here. The components come back as they are, so their
 * identity is stable and calling this in a component body remounts nothing.
 */
export function createBoundFields<
  Name extends string = string,
>(): BoundFields<Name> {
  return { FormInput, FormChoice, FormTextarea, FormSelect, FormSwitch };
}

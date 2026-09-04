import { useFormContext, useFormState, type FieldError } from 'react-hook-form';
import type { UseFormOptionField } from '@fmmenchi/ui';
import { toFieldMessages } from './rhf-messages.js';

/**
 * `@fmmenchi/ui`'s option-field port, implemented for react-hook-form — one
 * field drawn as many controls: a radio group, checkboxes under one name.
 *
 * It is the shortest of the five, and that is the library being uncontrolled
 * rather than this being easy. `register(name)` produces `name`, `onChange`,
 * `onBlur` and a `ref`, and react-hook-form keeps a LIST of refs per name
 * precisely so a group can register many; it then reads `checked` off the DOM
 * and infers the shape from the elements themselves — radio gives it the chosen
 * value, several checkboxes give it an array. Nothing here has to say which,
 * which is why this adapter ignores the `types` map its sibling needs.
 *
 * REGISTERED ONCE, SPREAD MANY TIMES. `register` is called at the top, not
 * inside `option`, so every control shares one registration — that is the
 * relationship react-hook-form expects, and calling it per option would
 * re-register the field on every render of every option.
 *
 * The `ref` reaching each control is the whole point of this shape existing:
 * bound the old way (through the group, as `FormSegmentedControl` does today)
 * there is no ref at all, so a library cannot focus the field from an error
 * summary and cannot write a value back into it.
 */
export function createRhfOptionField(): UseFormOptionField {
  return function useRhfOptionField(name) {
    const { register, control, setValue } = useFormContext();
    const { errors } = useFormState({ control, name });
    const registered = register(name);

    return {
      // `value` LAST, after the spread: it is the one thing that differs per
      // control, and react-hook-form's own registration carries none of it.
      option: (value) => ({ ...registered, value }),
      // THE WHOLE LIST, because a carrier that unmounts sends nothing and this
      // library keeps a store: measured, it kept the key of a control that had
      // gone, and stored in the order it was TOLD rather than the document's.
      // Both are the same cause, and both are fixed by being told the truth
      // instead of having it inferred.
      //
      // `shouldDirty`, because a removal IS a change the form should know it
      // has; validation stays on the form's own mode rather than being forced
      // here, which is the consumer's decision (ADR-0013).
      setValues: (values) => {
        setValue(name, [...values], { shouldDirty: true });
      },
      errors: toFieldMessages(errors[name] as FieldError | undefined),
    };
  };
}

/** The binding with nothing configured — the shape needs no field types here. */
export const useRhfOptionField: UseFormOptionField = createRhfOptionField();

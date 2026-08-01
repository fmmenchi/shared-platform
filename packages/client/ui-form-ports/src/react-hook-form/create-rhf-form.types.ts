import type { ReactNode } from 'react';
import type { FieldPath, FieldValues } from 'react-hook-form';
import type { BoundFields } from '@fmmenchi/ui';
import type { RhfFormProps } from './rhf-form.types.js';

/**
 * The form kit for ONE form shape: the wrapper and the bound components, all
 * three speaking the same values type.
 *
 * `FieldPath` is react-hook-form's own — the app passes VALUES and never sees a
 * path type, which is the point: the syntax of an indexed path belongs to the
 * library (`guests.0.name` here, `guests[0].name` for TanStack), so only its own
 * adapter can derive it.
 */
export interface RhfFormKit<T extends FieldValues> extends BoundFields<
  FieldPath<T>
> {
  Form: (props: RhfFormProps<T>) => ReactNode;
}

/**
 * What `createRhfForm` gives back when the values type is missing. A call with
 * no type argument would otherwise fall back to `FieldValues`, whose paths are
 * plain `string` — the typing would switch itself off, silently, which is the
 * failure this whole thing exists to prevent. As a message it fails at the
 * destructuring, which is where the mistake is.
 */
export type MissingFormValues =
  'createRhfForm needs your form values type — createRhfForm<MyFormValues>()';

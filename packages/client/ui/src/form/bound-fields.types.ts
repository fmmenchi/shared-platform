import type { ReactNode } from 'react';
import type { FormInputProps } from '../components/form-input/form-input.types.js';
import type { FormChoiceProps } from '../components/form-choice/form-choice.types.js';

/** The same props, with `name` narrowed from `string` to what the form has. */
export type WithFieldName<Props, Name extends string> = Omit<Props, 'name'> & {
  /** The field name, as your form library knows it — and only one it knows. */
  name: Name;
};

/**
 * The bound components, with their `name` checked against the form.
 *
 * They are the SAME components: the factory re-types, it does not wrap, so
 * there is no second implementation to keep in step and no new element in the
 * tree.
 */
export interface BoundFields<Name extends string> {
  FormInput: (props: WithFieldName<FormInputProps, Name>) => ReactNode;
  FormChoice: (props: WithFieldName<FormChoiceProps, Name>) => ReactNode;
}

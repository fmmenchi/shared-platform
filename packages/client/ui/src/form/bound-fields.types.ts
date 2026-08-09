import type { ReactNode } from 'react';
import type { FormInputProps } from '../components/form-input/form-input.types.js';
import type { FormChoiceProps } from '../components/form-choice/form-choice.types.js';
import type { FormTextareaProps } from '../components/form-textarea/form-textarea.types.js';
import type { FormSelectProps } from '../components/form-select/form-select.types.js';
import type { FormSwitchProps } from '../components/form-switch/form-switch.types.js';
import type { FormSegmentedControlProps } from '../components/form-segmented-control/form-segmented-control.types.js';

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
 *
 * ALL of them, which is the point of the interface being here rather than in
 * each adapter: a component added to the design system reaches every typed kit
 * — react-hook-form's, TanStack's, Formik's — without any of them being
 * touched. A kit that listed its own members would have gone stale the day
 * `FormTextarea` landed.
 */
export interface BoundFields<Name extends string> {
  FormInput: (props: WithFieldName<FormInputProps, Name>) => ReactNode;
  FormChoice: (props: WithFieldName<FormChoiceProps, Name>) => ReactNode;
  FormTextarea: (props: WithFieldName<FormTextareaProps, Name>) => ReactNode;
  FormSelect: (props: WithFieldName<FormSelectProps, Name>) => ReactNode;
  FormSwitch: (props: WithFieldName<FormSwitchProps, Name>) => ReactNode;
  FormSegmentedControl: (
    props: WithFieldName<FormSegmentedControlProps, Name>,
  ) => ReactNode;
}

import type { ReactNode } from 'react';
import type { FormInputProps } from '../components/form-input/form-input.types.js';
import type { FormDateInputProps } from '../components/form-date-input/form-date-input.types.js';
import type { FormComboboxProps } from '../components/form-combobox/form-combobox.types.js';
import type { FormChoiceProps } from '../components/form-choice/form-choice.types.js';
import type { FormTextareaProps } from '../components/form-textarea/form-textarea.types.js';
import type { FormSelectProps } from '../components/form-select/form-select.types.js';
import type { FormSwitchProps } from '../components/form-switch/form-switch.types.js';
import type { FormSegmentedControlProps } from '../components/form-segmented-control/form-segmented-control.types.js';

/**
 * The same props, with `name` narrowed from `string` to what the form has.
 *
 * DISTRIBUTIVE — `Props extends unknown ? … : never` — because one of these
 * props types is now a discriminated union (`FormCombobox`, which binds
 * differently for one value and for a set). Applied to a union directly, `Omit`
 * collapses it into a single object type and the discriminant widens: `multiple`
 * came out `boolean | undefined` where each half says `true` or `false`, so the
 * kit's re-typing stopped being assignable to the component it re-types. The
 * conditional makes the mapping happen once per member instead, and the union
 * survives.
 */
export type WithFieldName<Props, Name extends string> = Props extends unknown
  ? Omit<Props, 'name'> & {
      /** The field name, as your form library knows it — and only one it knows. */
      name: Name;
    }
  : never;

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
  FormDateInput: (props: WithFieldName<FormDateInputProps, Name>) => ReactNode;
  /**
   * GENERIC IN THE ITEM, so the kit cannot narrow it the way it narrows the
   * others: a combobox's props depend on the shape a consumer's options take,
   * and pinning `T` here would pin every combobox in the app to one of them.
   * The field NAME is still narrowed, which is what this kit is for.
   */
  FormCombobox: <T>(
    props: WithFieldName<FormComboboxProps<T>, Name>,
  ) => ReactNode;
  FormChoice: (props: WithFieldName<FormChoiceProps, Name>) => ReactNode;
  FormTextarea: (props: WithFieldName<FormTextareaProps, Name>) => ReactNode;
  FormSelect: (props: WithFieldName<FormSelectProps, Name>) => ReactNode;
  FormSwitch: (props: WithFieldName<FormSwitchProps, Name>) => ReactNode;
  FormSegmentedControl: (
    props: WithFieldName<FormSegmentedControlProps, Name>,
  ) => ReactNode;
}

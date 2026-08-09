import type { ComponentPropsWithRef, ReactNode } from 'react';

interface ToggleGroupOwnProps {
  /**
   * What the set is asking. Required, and it becomes the group's accessible
   * name: a `radiogroup` with no name is announced as "group" and tells a
   * screen-reader user nothing about what the segments choose between.
   */
  label: string;
  /**
   * The `name` the options share — which is what pairs them for the platform,
   * and what a form submits the chosen value under.
   */
  name: string;
  /** The selected value. Passing it makes the group CONTROLLED. */
  value?: string;
  /** The value selected at mount when uncontrolled. */
  defaultValue?: string;
  /** Called with the value the user picked, controlled or not. */
  onValueChange?: (value: string) => void;
  children?: ReactNode;
}

/**
 * Public ToggleGroup props.
 *
 * `role` is omitted: this is a radio group in the accessibility tree and in the
 * form, drawn as buttons (ADR-0025). Changing the role would leave the
 * platform's own arrow-key behaviour describing a widget that no longer claims
 * it.
 */
export type ToggleGroupProps = ToggleGroupOwnProps &
  Omit<ComponentPropsWithRef<'div'>, 'role' | keyof ToggleGroupOwnProps>;

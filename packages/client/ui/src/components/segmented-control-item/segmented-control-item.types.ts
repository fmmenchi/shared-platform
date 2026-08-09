import type { ComponentPropsWithRef, ReactNode } from 'react';

interface SegmentedControlItemOwnProps {
  /** What this segment stands for — submitted, and matched against the group's value. */
  value: string;
  children?: ReactNode;
}

/**
 * Public SegmentedControlItem props — every native `<input type="radio">` attribute
 * except the five the group owns.
 *
 * `type` and `role` are the segment's identity. `name` pairs the set and comes
 * from the group, which is the only thing that knows it. `checked` and
 * `defaultChecked` are the GROUP's value expressed on one option: an item able
 * to set its own would be able to disagree with its siblings, which is the
 * state a radio group exists to make unspeakable.
 *
 * `ref` and every other attribute — `disabled`, `onFocus`, `data-*` — pass
 * through to the input untouched.
 */
export type SegmentedControlItemProps = SegmentedControlItemOwnProps &
  Omit<
    ComponentPropsWithRef<'input'>,
    | 'type'
    | 'role'
    | 'name'
    | 'checked'
    | 'defaultChecked'
    | 'value'
    | 'children'
  >;

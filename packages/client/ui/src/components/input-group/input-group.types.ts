import type { ComponentPropsWithRef, ReactNode } from 'react';
import type { VariantProps } from 'class-variance-authority';
import type { inputGroupVariants } from './input-group.variants.js';

/** Variant axes, derived from the cva definition. */
export type InputGroupVariants = VariantProps<typeof inputGroupVariants>;

interface InputGroupOwnProps extends InputGroupVariants {
  /** One control, and the `InputGroupSlot`s inset beside it. */
  children?: ReactNode;
}

/**
 * Puts content INSIDE a field's border — an icon, a prefix, a clear button — by
 * taking the chrome the control owns when it stands alone: border, fill, radius,
 * height, the focus ring, and the invalid and disabled looks, which it reads from
 * the control's own native state rather than from a prop of its own (ADR-0013).
 *
 * The control stays a plain child and learns nothing about the group, so it keeps
 * forwarding its ref and spreading arbitrary props — `{...register()}` still works.
 * Its own `size` becomes redundant inside a group: the group is what has a height.
 */
export type InputGroupProps = InputGroupOwnProps &
  Omit<ComponentPropsWithRef<'div'>, keyof InputGroupOwnProps>;

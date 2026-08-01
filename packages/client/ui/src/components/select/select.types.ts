import type { ComponentPropsWithRef, ReactNode } from 'react';
import type { VariantProps } from 'class-variance-authority';
import type { selectVariants } from './select.variants.js';

/** Variant axis (`size`), derived from the cva definition. */
export type SelectVariants = VariantProps<typeof selectVariants>;

interface SelectOwnProps extends SelectVariants {
  /** The options: `<option>` and `<optgroup>`, as HTML writes them. */
  children?: ReactNode;
}

/**
 * Public Select props: a transparent native `<select>` (ADR-0013). Every native
 * attribute and `ref` passes through, and `value`/`onChange` are never hijacked,
 * so it drops into any form library. Set `aria-invalid` for the error styling.
 *
 * Two natives are deliberately refused, because accepting them would promise
 * something this component cannot keep:
 *
 * - **`multiple`** — the native multi-select is a scrolling box with no chips
 *   and a ctrl+click nobody discovers. For a few options use a `Fieldset` of
 *   `Checkbox`, which is already here and better; for many, a combobox.
 * - **`size`** (the native one, a row count) — that name is the design system's
 *   sizing axis, as on `Input`. A number arriving here would quietly mean
 *   something else, and a `<select size={5}>` is a list box, not this.
 */
export type SelectProps = SelectOwnProps &
  Omit<
    ComponentPropsWithRef<'select'>,
    keyof SelectOwnProps | 'multiple' | 'size'
  >;

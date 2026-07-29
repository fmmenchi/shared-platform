import type { ComponentPropsWithRef } from 'react';
import type { VariantProps } from 'class-variance-authority';
import type { inputVariants } from './input.variants.js';

/** Variant axis (`size`), derived from the cva definition. */
export type InputVariants = VariantProps<typeof inputVariants>;

/**
 * Public Input props: a transparent native `<input>` (ADR-0013). Every native
 * attribute and `ref` passes through, and `value`/`onChange` are never hijacked,
 * so it drops into any form library. `size` is the DS sizing axis and therefore
 * shadows the (rarely-used) native `size` attribute. Set `aria-invalid` for the
 * error styling.
 */
export type InputProps = InputVariants &
  Omit<ComponentPropsWithRef<'input'>, keyof InputVariants>;

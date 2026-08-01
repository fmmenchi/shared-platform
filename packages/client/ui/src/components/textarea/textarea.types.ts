import type { ComponentPropsWithRef } from 'react';
import type { VariantProps } from 'class-variance-authority';
import type { textareaVariants } from './textarea.variants.js';

/** Variant axes (`size`, `resize`), derived from the cva definition. */
export type TextareaVariants = VariantProps<typeof textareaVariants>;

/**
 * Public Textarea props: a transparent native `<textarea>` (ADR-0013). Every
 * native attribute and `ref` passes through — `rows`, `maxLength`, `readOnly`,
 * `wrap` — and `value`/`onChange` are never hijacked, so it drops into any form
 * library. Set `aria-invalid` for the error styling.
 *
 * `children` is deliberately absent. It is how a `<textarea>` takes its initial
 * text in HTML, and in React that is a trap: it sets the value through a
 * channel that reads as content, and React warns about it. `defaultValue` says
 * the same thing and says it plainly.
 */
export type TextareaProps = TextareaVariants &
  Omit<ComponentPropsWithRef<'textarea'>, keyof TextareaVariants | 'children'>;

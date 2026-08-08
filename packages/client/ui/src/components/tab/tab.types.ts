import type { ComponentPropsWithRef, ReactNode } from 'react';

export interface TabProps extends Omit<
  ComponentPropsWithRef<'button'>,
  'value' | 'disabled'
> {
  /**
   * What this tab IS, and what its panel answers to. Unique within the family,
   * and usable inside an `id` — no whitespace, since `aria-controls` is a
   * space-separated list of ids and a value with a space in it silently becomes
   * two references, one of them to nothing.
   */
  value: string;
  /**
   * Present but not available. Rendered as `aria-disabled`, never the native
   * `disabled`: the arrows still walk onto it, which is the APG's "focusable
   * but cannot be activated" — a tab the keyboard skips is one its user is
   * never told about.
   */
  disabled?: boolean;
  children: ReactNode;
}

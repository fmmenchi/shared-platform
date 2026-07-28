import type { ElementType, ReactNode } from 'react';
import type { VariantProps } from 'class-variance-authority';
import type { PolymorphicProps } from '../../primitives/polymorphic.js';
import type { buttonVariants } from './button.variants.js';

/** Colour role × size, derived from the cva definition. */
export type ButtonVariants = VariantProps<typeof buttonVariants>;

interface ButtonOwnProps extends ButtonVariants {
  /**
   * Decorative leading icon (the spinner takes its slot while loading). Must
   * follow the injected-icon contract (see `IconRenderer` in the ports):
   * `currentColor`, square viewBox, `em`-sized — so it inherits the variant's
   * foreground role.
   */
  icon?: ReactNode;
  /**
   * Decorative trailing icon (chevron, external-link…). Stays visible while
   * loading — the leading spinner carries the state, and removing it would
   * shift the layout. Same injected-icon contract as `icon`.
   */
  iconEnd?: ReactNode;
  /**
   * Show a spinner + a localized "loading" status and block activation —
   * PENDING, not disabled: the control stays focusable (`aria-disabled` +
   * click guard, never native `disabled`, which would drop focus
   * mid-interaction) and keeps its variant colours. The status text is
   * resolved from the active locale (DS-internal copy) and announced when
   * loading starts via a persistent `role="status"` region rendered OUTSIDE
   * the button (so the accessible name stays clean); the end is conveyed by
   * `aria-busy` clearing and the region emptying.
   */
  isLoading?: boolean;
}

/** Public Button props — polymorphic via `as`. */
export type ButtonProps<As extends ElementType = 'button'> = PolymorphicProps<
  As,
  ButtonOwnProps
>;

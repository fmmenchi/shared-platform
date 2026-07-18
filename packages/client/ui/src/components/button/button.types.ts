import type { ElementType, ReactNode } from 'react';
import type { VariantProps } from 'class-variance-authority';
import type { PolymorphicProps } from '../../primitives/polymorphic.js';
import type { buttonVariants } from './button.variants.js';

/** Colour role × size, derived from the cva definition. */
export type ButtonVariants = VariantProps<typeof buttonVariants>;

interface ButtonOwnProps extends ButtonVariants {
  /** Decorative icon (hidden while loading). */
  icon?: ReactNode;
  /**
   * Show a spinner + a localized "loading" status and block interaction.
   * The status text is resolved from the active locale (DS-internal copy).
   */
  isLoading?: boolean;
}

/** Public Button props — polymorphic via `as`. */
export type ButtonProps<As extends ElementType = 'button'> = PolymorphicProps<
  As,
  ButtonOwnProps
>;

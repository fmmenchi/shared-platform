import type { ComponentPropsWithRef, ReactNode } from 'react';
import type { VariantProps } from 'class-variance-authority';
import type { badgeVariants } from './badge.variants.js';

/** Variant axes (variant · emphasis · size), derived from the cva definition. */
export type BadgeVariants = VariantProps<typeof badgeVariants>;

interface BadgeOwnProps extends BadgeVariants {
  /** The label. A Badge is presentational — its text IS its accessible name. */
  children?: ReactNode;
  /**
   * Optional leading icon, decorative (`aria-hidden`, sized to 1em). The text
   * carries the meaning; an icon with no text (and no `aria-label`) is warned
   * about in development.
   */
  icon?: ReactNode;
}

/**
 * Public Badge props. Presentational and non-polymorphic (a native `<span>`);
 * an interactive/removable badge is a Tag/Chip, not this component.
 */
export type BadgeProps = BadgeOwnProps &
  Omit<ComponentPropsWithRef<'span'>, keyof BadgeOwnProps>;

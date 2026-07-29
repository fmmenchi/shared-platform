import type { ComponentPropsWithRef, ReactNode } from 'react';
import type { VariantProps } from 'class-variance-authority';
import type { alertVariants } from './alert.variants.js';

/** Variant axis (the semantic status role), derived from the cva definition. */
export type AlertVariants = VariantProps<typeof alertVariants>;

/**
 * How the alert is announced by assistive tech. `polite` → `role="status"`,
 * `assertive` → `role="alert"`, `off` → no live region (for content already
 * present on load). Defaults by variant: `error` is assertive, the rest polite.
 */
export type AlertLive = 'off' | 'polite' | 'assertive';

interface AlertOwnProps extends AlertVariants {
  /** The message body. */
  children?: ReactNode;
  /** Optional bold lead-in above the message. */
  title?: ReactNode;
  /** Optional decorative leading icon (aria-hidden). Icons are app-provided. */
  icon?: ReactNode;
  /** Live-region politeness; see {@link AlertLive}. */
  live?: AlertLive;
}

/**
 * Public Alert props. Presentational region built on a `<div>`; the status is
 * conveyed by a visually-hidden severity word (not colour alone) and, when
 * `live` is set, an ARIA live region.
 */
export type AlertProps = AlertOwnProps &
  Omit<ComponentPropsWithRef<'div'>, keyof AlertOwnProps>;

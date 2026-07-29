import type { ComponentPropsWithRef, ReactNode } from 'react';
import type { VariantProps } from 'class-variance-authority';
import type { alertVariants } from './alert.variants.js';

/** Variant axis (the semantic status role), derived from the cva definition. */
export type AlertVariants = VariantProps<typeof alertVariants>;

/**
 * How the alert is announced by assistive tech. `polite` → `role="status"`,
 * `assertive` → `role="alert"`, `off` → no live region. Defaults by variant:
 * `error` is assertive, the rest polite.
 *
 * CAVEAT: this sets the POLITENESS, not a guarantee. A live region inserted into
 * the DOM already containing its text is announced unreliably by screen readers
 * (especially `polite`) — the robust path is to keep the Alert mounted and CHANGE
 * its content, which mutates an existing region. For one-shot transient
 * notifications, a dedicated live-region/toast is a better fit than an inline
 * Alert. `assertive`/`error` is the most tolerant of insert-with-content.
 */
export type AlertLive = 'off' | 'polite' | 'assertive';

interface AlertOwnProps extends AlertVariants {
  /** The message body. */
  children?: ReactNode;
  /**
   * Optional bold lead-in above the message. Note: this repurposes the prop name
   * `title` as a content slot, so the native `title` (tooltip) attribute is not
   * available on `<Alert>` — pass a wrapping element if you need one.
   */
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

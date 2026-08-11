import type { ComponentPropsWithRef, ReactNode } from 'react';

interface BreadcrumbOwnProps {
  /** The trail — `BreadcrumbLink`s, first level first. */
  children?: ReactNode;
}

/**
 * Public Breadcrumb props. Everything else an `<nav>` takes flows through —
 * including `aria-label`/`aria-labelledby`, which override the localized
 * default name.
 */
export type BreadcrumbProps = BreadcrumbOwnProps &
  Omit<ComponentPropsWithRef<'nav'>, keyof BreadcrumbOwnProps>;

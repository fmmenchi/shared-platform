import type { ComponentPropsWithRef, ReactNode } from 'react';

interface AccordionOwnProps {
  /** The items. */
  children?: ReactNode;
  /**
   * Only one open at a time. Implemented by the platform, not by us: it gives
   * every item the same `name`, and `<details name>` closes the others itself.
   *
   * Off by default, because the exclusive one is the lossy one — it takes away
   * the comparison a reader may be in the middle of making. Turn it on when the
   * panels are alternatives rather than sections.
   */
  exclusive?: boolean;
}

export type AccordionProps = AccordionOwnProps &
  Omit<ComponentPropsWithRef<'div'>, keyof AccordionOwnProps>;

import type { ComponentPropsWithRef } from 'react';

interface SeparatorOwnProps {
  /**
   * Which way the line runs. Defaults to `horizontal` — that is what an `<hr>`
   * already is. Unlike `ToolbarSeparator`, this is a prop: standing alone
   * there is no parent whose orientation could answer for it.
   */
  orientation?: 'horizontal' | 'vertical';
  /**
   * Purely visual: keep the element, hide it from assistive tech
   * (`aria-hidden`). For a line that repeats a boundary the structure already
   * states — a rule under a heading, a divider between `<section>`s. Defaults
   * to `false`: an `<hr>` is semantic by nature.
   */
  decorative?: boolean;
}

/** Everything an `<hr>` takes — it is one — plus the two axes above. */
export type SeparatorProps = SeparatorOwnProps &
  Omit<ComponentPropsWithRef<'hr'>, keyof SeparatorOwnProps>;

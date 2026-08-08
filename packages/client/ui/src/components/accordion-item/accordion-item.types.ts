import type { ComponentPropsWithRef, ReactNode } from 'react';

interface AccordionItemOwnProps {
  children?: ReactNode;
  /**
   * Drives it. The controlled half: while it is given, this prop is the source
   * of truth and the item is opened or closed to match — including BACK, when
   * the user toggles it and the prop still says otherwise.
   *
   * Which makes `onOpenChange` mandatory in practice, and a dev warning says
   * so: `<summary>` is toggled by click, `Enter` and `Space` without asking
   * React, so a consumer who does not feed those back has built a panel that
   * cannot be opened.
   *
   * Leave it out for the uncontrolled half and let the DOM own the state.
   */
  open?: boolean;
  /**
   * Seeded once, at mount. `<details open>` is declarative, but rendering it
   * from a prop React re-asserts is what makes a panel snap shut under the
   * user's own click — so the seed is written once to the element and never
   * again. A SEED, not a control.
   */
  defaultOpen?: boolean;
  /** Told when it opens or closes, whoever caused it. */
  onOpenChange?: (open: boolean) => void;
}

export type AccordionItemProps = AccordionItemOwnProps &
  Omit<ComponentPropsWithRef<'details'>, keyof AccordionItemOwnProps>;

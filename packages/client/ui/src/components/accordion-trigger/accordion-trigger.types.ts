import type { ComponentPropsWithRef, ReactNode } from 'react';

interface AccordionTriggerOwnProps {
  /** The label. It names the panel, so make it say what is inside. */
  children?: ReactNode;
}

/**
 * Public props.
 *
 * No `as` and no `role`: a `<summary>` IS the disclosure button, and the
 * accessibility tree already exposes it as `DisclosureTriangle` with an
 * `expanded` state — measured, both values, before and after opening. Anything
 * that replaced the element or its role would take that away and have to
 * rebuild it in ARIA.
 */
export type AccordionTriggerProps = AccordionTriggerOwnProps &
  Omit<
    ComponentPropsWithRef<'summary'>,
    keyof AccordionTriggerOwnProps | 'role'
  >;

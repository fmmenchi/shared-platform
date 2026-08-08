import type { ComponentPropsWithRef, ReactNode } from 'react';

interface AccordionTriggerOwnProps {
  /** The label. It names the panel, so make it say what is inside. */
  children?: ReactNode;
}

/**
 * Public props.
 *
 * No `as`, no `role`, no `aria-expanded`: a `<summary>` IS the disclosure
 * button, and the
 * accessibility tree already exposes it as `DisclosureTriangle` with an
 * `expanded` state — measured, both values, before and after opening. Anything
 * that replaced the element or its role would take that away and have to
 * rebuild it in ARIA. `aria-expanded` is refused for the sharper reason: it
 * would sit BESIDE the state the element already publishes and drift from it.
 *
 * A spread bypasses all of this — TypeScript does not excess-property-check
 * one — which is a hole this component accepts rather than closes: unlike
 * `Heading`'s `aria-level`, neither of these WINS over the element's own
 * semantics, so a stray one is visible in the markup rather than silently
 * corrupting the outline.
 */
export type AccordionTriggerProps = AccordionTriggerOwnProps &
  Omit<
    ComponentPropsWithRef<'summary'>,
    keyof AccordionTriggerOwnProps | 'role'
  >;

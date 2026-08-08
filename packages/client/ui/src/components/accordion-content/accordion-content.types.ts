import type { ComponentPropsWithRef, ReactNode } from 'react';

interface AccordionContentOwnProps {
  children?: ReactNode;
}

/**
 * Public props. `role` is refused: the panel is not a landmark, and a page of
 * disclosures each announcing a region fills the rotor with things the reader
 * never asked for. The component's own comment said so while the type let a
 * caller add one.
 */
export type AccordionContentProps = AccordionContentOwnProps &
  Omit<ComponentPropsWithRef<'div'>, keyof AccordionContentOwnProps | 'role'>;

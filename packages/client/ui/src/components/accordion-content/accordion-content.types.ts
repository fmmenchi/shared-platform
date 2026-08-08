import type { ComponentPropsWithRef, ReactNode } from 'react';

interface AccordionContentOwnProps {
  children?: ReactNode;
}

export type AccordionContentProps = AccordionContentOwnProps &
  Omit<ComponentPropsWithRef<'div'>, keyof AccordionContentOwnProps>;

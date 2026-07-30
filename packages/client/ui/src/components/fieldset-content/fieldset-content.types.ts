import type { ComponentPropsWithRef, ReactNode } from 'react';

/** How `FieldsetContent` lays the controls out. */
export type FieldsetOrientation = 'vertical' | 'horizontal';

interface FieldsetContentOwnProps {
  children?: ReactNode;
  /**
   * A stack (`vertical`, the default) or a wrapping row (`horizontal`). Declared as
   * a plain union rather than inherited from the cva definition, because
   * `VariantProps` also admits `null` — and cva reads `null` as "skip this
   * variant", which would typecheck and silently leave the controls with no layout
   * at all.
   */
  orientation?: FieldsetOrientation;
}

/**
 * Wraps a group's controls and owns their layout. It is a separate element because
 * the rendered `<legend>` sits outside the fieldset's layout box and would never
 * receive its `gap`.
 */
export type FieldsetContentProps = FieldsetContentOwnProps &
  Omit<ComponentPropsWithRef<'div'>, keyof FieldsetContentOwnProps>;

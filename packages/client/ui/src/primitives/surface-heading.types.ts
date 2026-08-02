import type { ComponentPropsWithRef, ElementType } from 'react';

/** The heading levels a surface may be named by, and nothing else. */
export type HeadingLevel = Extract<
  ElementType,
  'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
>;

/** What a family's own heading part passes down. */
export interface SurfaceHeadingProps extends ComponentPropsWithRef<'h2'> {
  /** Render as this heading level instead of `h2`. */
  as?: HeadingLevel;
  /** The surface's registry: called with this heading's id, returns its removal. */
  register: ((id: string) => () => void) | undefined;
}

import type { ComponentPropsWithRef, ReactNode } from 'react';
import type { VariantProps } from 'class-variance-authority';
import type { headingVariants } from './heading.variants.js';

/** Visual sizes, derived from the cva definition. */
export type HeadingVariants = VariantProps<typeof headingVariants>;

/** The six headings HTML has. There is no seventh, so the type says so. */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

interface HeadingOwnProps extends HeadingVariants {
  /**
   * Which heading this IS — the tag, and the document's outline. A screen
   * reader user navigates by these, so the number follows the structure of the
   * page and nothing else: never skip one to get a smaller heading.
   *
   * Required, and deliberately not defaulted. A default would be guessed from
   * nowhere — this component cannot see where it sits — and the guess would be
   * silent, which is the failure mode headings already suffer from most.
   */
  level: HeadingLevel;
  /**
   * How big it LOOKS, when that has to differ from what it is. Defaults to the
   * size that belongs to `level`, so the common case passes nothing.
   *
   * This is the whole reason the component exists: in raw markup the two were
   * one decision, so an `<h2>` that had to look small became an `<h4>` and the
   * outline was bent to serve the visual. Here the outline stays honest and the
   * look absorbs the request — `level={2} size="h4"` is "an h2 that looks like
   * an h4", which is the sentence, not a translation of it.
   */
  size?: HeadingVariants['size'];
  children?: ReactNode;
}

/**
 * Public Heading props.
 *
 * No `as`: the element is `level`'s to decide, and a second way to choose the
 * tag could only disagree with it. `role` is refused here for the same reason.
 *
 * `aria-level` is NOT — not because it is allowed, but because a type cannot
 * refuse it: TypeScript does not excess-property-check a JSX attribute whose
 * name is not a valid JS identifier, so the `Omit` below is powerless over it
 * (verified: the `@ts-expect-error` for it is reported unused). It is stripped
 * at runtime instead, in `heading.guards.ts`, which is the only guarantee there
 * is — and it needs to be, because it WINS: measured, `aria-level={6}` had an
 * `<h3>` announced as level 6, silently.
 */
export type HeadingProps = HeadingOwnProps &
  Omit<
    ComponentPropsWithRef<'h1'>,
    keyof HeadingOwnProps | 'role' | 'aria-level'
  >;

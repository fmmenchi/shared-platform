import type { ComponentPropsWithRef } from 'react';
import type { VariantProps } from 'class-variance-authority';
import type { skeletonVariants } from './skeleton.variants.js';

/** Variant axes, derived from the cva definition. */
export type SkeletonVariants = VariantProps<typeof skeletonVariants>;

/**
 * The one axis, written out rather than inherited from `SkeletonVariants`.
 * There is nothing else to declare, and an interface that only extends is an
 * empty one — so the axis carries its own documentation here, where an editor
 * shows it, as well as in the story `argTypes` the props table is built from.
 */
interface SkeletonOwnProps {
  /**
   * The outline of the thing that has not arrived yet. Defaults to `text` —
   * the case that comes up most, and the one shape that needs the component to
   * know something: it takes its height from the current font size, so a
   * placeholder for a heading comes out heading-sized on its own.
   *
   * - `text` — one line of type. It occupies the LINE BOX (`1lh`), not the
   *   font size, so a stack of them measures the same as the paragraph it
   *   replaces; the bar is painted inside that box the way glyphs are.
   * - `block` — a panel, an image, a chart. **Give it a height**: the `1em`
   *   default only exists so it is never an invisible zero-height box, and
   *   apart from its rounder corners it is otherwise the same box as `text`.
   * - `circle` — an avatar. Square by `aspect-ratio`, so changing only the
   *   width keeps it round, and it declines to stretch in a flex row.
   *
   * Size is the consumer's: a placeholder has to match a layout this library
   * cannot see. `style` works everywhere — consumers import precompiled CSS
   * and are not required to run Tailwind, so a utility class is not a
   * portable way to size one.
   */
  shape?: SkeletonVariants['shape'];
}

/**
 * Public Skeleton props — everything a `<div>` takes, minus its inside.
 *
 * `children` is omitted deliberately, and it is the whole design. A skeleton
 * stands WHERE content will be; it does not wrap it. Offering the slot would
 * invite `<Skeleton>{content}</Skeleton>` — a component that swaps its own
 * children on a `loading` flag — and that is a different component with a
 * different contract: it would own the layout of arbitrary content, and it
 * would have to answer for what assistive tech hears during the swap. The
 * consumer's own `{loading ? <Skeleton /> : <Content />}` says the same thing
 * in one line and keeps that answer where the loading actually happens.
 *
 * WHAT THAT COSTS, stated because the argument is otherwise only half told: a
 * wrapper can measure the real child and size the placeholder from it, so the
 * two cannot drift. Swapping instead puts that sync on the caller — the
 * placeholder for a `lg` Avatar has to be sized by hand, and nothing will tell
 * you when the design changes underneath it. The trade is deliberate (`text`
 * reads its own font, so the common case needs no sync at all), not free.
 *
 * The omission is enforced at RUNTIME as well, in the component. On the type
 * alone it is decorative: a consumer's `(p: ComponentProps<'div'>) =>
 * <Skeleton {...p} />` typechecks, and the payload would render inside a
 * permanently `aria-hidden` box.
 */
export type SkeletonProps = SkeletonOwnProps &
  Omit<
    ComponentPropsWithRef<'div'>,
    keyof SkeletonOwnProps | 'children' | 'dangerouslySetInnerHTML'
  >;

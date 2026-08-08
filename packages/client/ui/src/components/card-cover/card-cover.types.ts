import type { PolymorphicProps } from '../../primitives/polymorphic.js';

/**
 * What the media is ALLOWED to be — constrained, like every other `as` in this
 * package. `img` covers the case; `picture` is for art direction with
 * `<source>`s; `video` for a cover that moves.
 */
export type CardCoverElement = 'img' | 'picture' | 'video';

export interface CardCoverOwnProps {
  /**
   * The shape the media is held in, as a CSS `aspect-ratio`. `16 / 9` by
   * default.
   *
   * It is here rather than left to the file because a grid of cards whose
   * pictures each keep their own proportions is a grid that never lines up —
   * and because the media is cropped to fill it, so nothing is stretched.
   */
  ratio?: string;
}

/** Public CardCover props — polymorphic via `as`, within `CardCoverElement`. */
export type CardCoverProps<As extends CardCoverElement = 'img'> =
  PolymorphicProps<As, CardCoverOwnProps> & { as?: As };

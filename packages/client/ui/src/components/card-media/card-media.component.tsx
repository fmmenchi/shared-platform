import type { CSSProperties, ElementType } from 'react';
import { cn } from '../../util/cn.js';
import type { CardMediaElement, CardMediaProps } from './card-media.types.js';
import styles from './card-media.module.css';

/**
 * A picture that reaches the card's edges.
 *
 * IT IS THE MEDIA ELEMENT, not a box around one. The first version wrapped the
 * consumer's `<img>` in a `<div>`, and the wrapper turned out to carry nothing:
 * the negative margins, the `aspect-ratio`, the crop and the rounded corners
 * all apply to an `<img>` directly — measured, not assumed. An element that
 * carries nothing is an element that has not earned its place, which is the
 * same rule that keeps `CardHeader` and `CardFooter` out of this family.
 *
 * `as="picture"` or `as="video"` for the cases that genuinely need a wrapper;
 * the stylesheet then fills the `<img>` inside.
 *
 * WHAT IT DOES CARRY, and what a consumer gets wrong by hand: it cancels
 * exactly the card's padding — the same TOKEN the card pads with, so the two
 * cannot drift — and it rounds its own corners, because `Card` deliberately has
 * no `overflow: hidden`. That would also clip the focus ring of everything
 * inside it, and a keyboard user losing the ring on the last button is a worse
 * trade than a picture that rounds its own corners.
 *
 * It is explicit rather than automatic — the card does not style every `<img>`
 * it happens to contain — because an image in a card is not necessarily its
 * cover. An avatar, a logo or a chart must NOT bleed to the edges, and a rule
 * that guessed would be wrong for all three.
 */
function CardMedia<As extends CardMediaElement = 'img'>(
  props: CardMediaProps<As>,
) {
  const { as, ratio, className, style, ...rest } = props;
  const Component = (as ?? 'img') as ElementType;

  return (
    <Component
      {...rest}
      className={cn(styles.media, className)}
      style={
        ratio === undefined
          ? style
          : ({ ...style, '--card-media-ratio': ratio } as CSSProperties)
      }
    />
  );
}

export { CardMedia };

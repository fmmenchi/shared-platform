import { useEffect, useRef } from 'react';
import type { ElementType } from 'react';
import { cn } from '../../util/cn.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { deferDevCheck } from '../../primitives/use-dev-warning.js';
import { cardVariants } from './card.variants.js';
import type { CardElement, CardProps } from './card.types.js';

/** What an `<a>` may not contain, per the HTML content model. */
const INTERACTIVE = 'a[href], button, input, select, textarea, [tabindex]';

/**
 * A card: a bounded surface holding one thing, and nothing about what that
 * thing is.
 *
 * It is NOT interactive. Making the whole surface clickable is `CardTitle`'s
 * job, with a destination — the link stays around the title, so the accessible
 * name stays the title, while an invisible layer belonging to that link covers
 * the card. Visually large, semantically small. The alternative a card usually
 * gets — the whole box wrapped in an `<a>` — announces the entire contents as
 * the link's name and forbids it ever growing a second action.
 *
 * `position: relative` lives here because that layer measures itself against
 * this box. It is the one piece of the mechanism the card owns, and the reason
 * the parts are parts.
 *
 * There is deliberately no `overflow: hidden`, though it would be the quick way
 * to clip `CardMedia` to the corners: it also clips the focus ring of anything
 * inside, and a keyboard user losing the ring on the last button in a card is a
 * worse trade than a picture that has to round its own corners. `CardMedia`
 * rounds its own.
 */
function Card<As extends CardElement = 'div'>(props: CardProps<As>) {
  const { as, variant, className, children, ref, ...rest } = props;
  const Component = (as ?? 'div') as ElementType;
  const node = useRef<HTMLElement | null>(null);

  /*
   * THE ONE COMBINATION THE TYPE CANNOT SEE. `as="a"` is legal and useful, and
   * `as="a"` with a button inside is neither: the HTML content model excludes
   * interactive content from `<a>`, so the button is invalid markup, the
   * keyboard cannot reach it reliably, and activating it also navigates.
   *
   * It is a question about rendered children, which no prop type can answer,
   * so it is asked of the DOM — one task later, because the first effect pass
   * runs before children that mount asynchronously are there.
   */
  useEffect(
    () =>
      deferDevCheck(() => {
        const element = node.current;
        if (!element || element.tagName !== 'A') return;
        if (!element.querySelector(INTERACTIVE)) return;
        console.warn(
          'Card: `as="a"` cannot contain a link, button or field — HTML forbids interactive content inside an anchor, so it is invalid markup and the keyboard cannot reach it. Give the destination to `CardTitle` instead, which makes the whole card clickable without swallowing what is inside it.',
        );
      }),
    [as],
  );

  return (
    <Component
      {...rest}
      ref={mergeRefs(ref, node)}
      className={cn(cardVariants({ variant }), className)}
    >
      {children}
    </Component>
  );
}

export { Card };

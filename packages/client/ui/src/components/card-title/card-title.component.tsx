import type { ElementType } from 'react';
import { useUiAdapters } from '../../i18n/provider.js';
import { Slot } from '../../primitives/slot.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { Heading } from '../heading/heading.component.js';
import type { CardTitleProps } from './card-title.types.js';
import styles from './card-title.module.css';

/**
 * The card's name, and — with a destination — the thing that makes the whole
 * card clickable.
 *
 * IT IS A `Heading`, not a heading of its own. The type scale, the zeroed UA
 * margin, `text-wrap: balance` and the `min-inline-size: 0` that stops one long
 * word from sizing a grid track all belong to that component; a second copy
 * here would be the same decisions made twice and drifting from the first
 * revision. So `level` and `size` are its props, passed straight through —
 * including `level` being REQUIRED, which is its position and applies here
 * unchanged: a card cannot see where it sits either, and a default would be a
 * guess made silently against the page outline.
 *
 * THE LINK IS HERE AND NOT ON THE CARD because the accessible name comes from
 * the link's own text. A card whose surface is one big `<a>` is announced as
 * "…every word in the card…, link"; this one is announced as its title. The
 * card's surface still activates it, because the anchor grows an invisible
 * layer the size of the card — `position: relative` on `Card`, `inset: 0`
 * here. Visually large, semantically small.
 *
 * The heading WRAPS the link, never the other way round: a link containing a
 * heading is a heading a screen reader's heading list can still find, but the
 * heading's name then belongs to the link, and the two stop agreeing.
 *
 * The router comes from the provider, like `NavLink`'s — the `Link` adapter,
 * injected once. Read tolerantly, so a card outside a provider is still a
 * plain anchor.
 *
 * `href` is what that adapter can be given, and it is a URL string. When the
 * destination is not expressible as one — a typed route with params, a link
 * that needs its own handler — `asChild` hands the whole element over instead:
 * the app writes its router's link itself, with its own types checked by its
 * own library, and this component puts the layer and the hook on it. That is
 * the case that used to have no answer here at all.
 */
function CardTitle(props: CardTitleProps) {
  const { href, asChild, children, ...heading } = props;
  const injected = useUiAdapters()?.Link;
  const Link = (injected ?? 'a') as ElementType;

  // Both is not a half-working combination, it is two destinations: the `href`
  // would be dropped on the floor while the child navigates somewhere else.
  useDevWarning(
    Boolean(asChild && href !== undefined),
    'CardTitle: given both `asChild` and `href`. The child carries the destination, so the `href` is ignored — remove it.',
  );

  const link = {
    // The hook `card.module.css` paints the surface from. A hashed class from
    // this file could not be named from that one — which is also why a
    // hand-rolled link cannot reproduce this, and why `asChild` exists.
    'data-card-link': '',
    className: styles.link,
  };

  return (
    <Heading {...heading}>
      {asChild ? (
        <Slot {...link}>{children}</Slot>
      ) : href === undefined ? (
        children
      ) : (
        <Link href={href} {...link}>
          {children}
        </Link>
      )}
    </Heading>
  );
}

export { CardTitle };

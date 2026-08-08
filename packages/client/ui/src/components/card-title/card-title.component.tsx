import type { ElementType } from 'react';
import { useUiAdapters } from '../../i18n/provider.js';
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
 */
function CardTitle(props: CardTitleProps) {
  const { href, children, ...heading } = props;
  const injected = useUiAdapters()?.Link;
  const Link = (injected ?? 'a') as ElementType;

  return (
    <Heading {...heading}>
      {href === undefined ? (
        children
      ) : (
        <Link
          href={href}
          // The hook `card.module.css` paints the surface from. A hashed class
          // from this file could not be named from that one.
          data-card-link=""
          className={styles.link}
        >
          {children}
        </Link>
      )}
    </Heading>
  );
}

export { CardTitle };

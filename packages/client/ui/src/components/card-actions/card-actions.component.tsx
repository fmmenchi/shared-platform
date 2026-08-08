import { cn } from '../../util/cn.js';
import type { CardActionsProps } from './card-actions.types.js';
import styles from './card-actions.module.css';

/**
 * The card's actions, at the bottom — and above the title's invisible layer.
 *
 * THE SECOND HALF IS WHY IT EXISTS. When `CardTitle` has a destination it
 * covers the whole card with a layer that takes the clicks; anything else
 * clickable has to sit above that layer or it stops working, and "remember to
 * add `position: relative`" is exactly the kind of rule that survives a code
 * review and not a refactor. So the rule lives here instead of in a note.
 *
 * The first half is the grid: `margin-block-start: auto` pins the row to the
 * bottom, so a row of cards with summaries of different lengths still has its
 * buttons on one line. Alone on a page it does nothing, which is the correct
 * amount.
 */
function CardActions(props: CardActionsProps) {
  const { className, children, ...rest } = props;

  return (
    <div {...rest} className={cn(styles.actions, className)}>
      {children}
    </div>
  );
}

export { CardActions };

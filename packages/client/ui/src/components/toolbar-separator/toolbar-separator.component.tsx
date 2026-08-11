import { cn } from '../../util/cn.js';
import { useToolbarPart } from '../toolbar/toolbar.context.js';
import type { ToolbarSeparatorProps } from './toolbar-separator.types.js';
import styles from './toolbar-separator.module.css';

/**
 * A line between groups of controls — "Bold Italic Underline │ Left Centre
 * Right".
 *
 * An `<hr>`, whose implicit role is already `separator`, so there is no role to
 * write — the same element `MenuSeparator` uses, for the same reason. It joins
 * no family and cannot take focus, so the arrows and the tab stop pass straight
 * over it: a separator is a thing to see, not a thing to reach.
 *
 * IT LIES ACROSS THE BAR, so its orientation is the OPPOSITE of the toolbar's,
 * and that is the whole reason this is a component rather than an `<hr>` a
 * consumer writes. `role="separator"` defaults to `horizontal`; a bar running
 * across the page needs a line running down it, which has to say
 * `aria-orientation="vertical"` or be announced as the thing it is not. Getting
 * that backwards is easy, invisible, and exactly the kind of decision a design
 * system exists to make once.
 *
 * The orientation comes from the bar rather than a prop for the same reason: a
 * consumer who turns a toolbar vertical should not have to remember to turn
 * every separator in it as well.
 *
 * WHY IT IS NOT `Separator`. The general-purpose one exists; this is a part
 * of a family, like `MenuSeparator`, and it stays because a toolbar's
 * separator has an answer of its own to give: it is what the family's own
 * stylesheet knows about spacing between groups.
 */
function ToolbarSeparator(props: ToolbarSeparatorProps) {
  const { className, ...rest } = props;
  const context = useToolbarPart('ToolbarSeparator');

  // Across the bar. Outside one there is nothing to be across, and a horizontal
  // rule is what an `<hr>` already is.
  const vertical = context !== null && context.orientation === 'horizontal';

  return (
    <hr
      {...rest}
      // Stated only when vertical: `horizontal` is what `role="separator"`
      // already means, and stating a default is a second place for it to be
      // wrong.
      aria-orientation={vertical ? 'vertical' : undefined}
      data-orientation={vertical ? 'vertical' : 'horizontal'}
      className={cn(styles.separator, className)}
    />
  );
}

export { ToolbarSeparator };

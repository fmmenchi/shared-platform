import { cn } from '../../util/cn.js';
import type { SeparatorProps } from './separator.types.js';
import styles from './separator.module.css';

/**
 * A visible line between two regions of content — sections of a page, entries
 * in a row of metadata ("12 comments │ 3 likes").
 *
 * Always an `<hr>`, in both orientations, whose implicit role is already
 * `separator` — the same element `MenuSeparator` and `ToolbarSeparator` use,
 * for the same reason: there is no role to write, and no div to dress up as
 * one. It cannot take focus and joins no family, so the tab stop passes
 * straight over it — a separator is a thing to see, not a thing to reach.
 *
 * `decorative` keeps the line and hides it from assistive tech, for the rule
 * that repeats a boundary the structure already states. The default stays
 * semantic, matching the element's own nature; hiding is the deliberate act.
 */
function Separator(props: SeparatorProps) {
  const {
    className,
    orientation = 'horizontal',
    decorative = false,
    ...rest
  } = props;
  const vertical = orientation === 'vertical';

  return (
    <hr
      {...rest}
      // The whole of `decorative`: the element stays, assistive tech loses it.
      aria-hidden={decorative ? true : undefined}
      // Stated only when it means something: `horizontal` is what
      // `role="separator"` already means (stating a default is a second place
      // for it to be wrong), and on a hidden element there is nobody left to
      // tell.
      aria-orientation={vertical && !decorative ? 'vertical' : undefined}
      // Always present — the one attribute the stylesheet and a consumer's
      // own CSS can both key on. Never selected bare: half the ecosystem puts
      // `data-orientation` on its components, so every rule pairs it with the
      // module class.
      data-orientation={orientation}
      className={cn(styles.separator, className)}
    />
  );
}

export { Separator };

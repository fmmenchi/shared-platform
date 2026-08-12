import { useEffect, useRef } from 'react';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { deferDevCheck } from '../../primitives/use-dev-warning.js';
import { cn } from '../../util/cn.js';
import type { SeparatorProps } from './separator.types.js';
import styles from './separator.module.css';

/**
 * A visible line between two regions of content — sections of a page, or the
 * entries in a row of metadata ("12 comments │ 3 likes") when that row is a
 * flex container of its own.
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
 *
 * NOT INSIDE A `<p>`, WHICH IS WHY THE METADATA ROW IS A FLEX CONTAINER above
 * and not a paragraph. An `<hr>` is flow content, a paragraph takes phrasing
 * content, and the two do not meet politely: the HTML parser closes the
 * paragraph at the `<hr>` and opens an implied second one after it. Measured —
 * `<p>12 comments<Separator />3 likes</p>` renders on the server as one
 * paragraph containing the line, and the browser parses that same string into
 * TWO paragraphs with the line hoisted out between them, while rendering it on
 * the client leaves the line inside the one paragraph. Two different trees from
 * one component, which is a hydration mismatch by construction, and a flex row
 * that silently stops being a row. The guard below says so where it happens.
 */
function Separator(props: SeparatorProps) {
  const {
    className,
    orientation = 'horizontal',
    decorative = false,
    ...rest
  } = props;
  const vertical = orientation === 'vertical';
  const el = useRef<HTMLHRElement>(null);

  // One task later, and asking the DOM rather than the props: nothing about
  // this component's own arguments can tell it what it was put inside.
  useEffect(
    () =>
      deferDevCheck(() => {
        if (el.current?.parentElement?.tagName !== 'P') return;
        console.warn(
          'Separator: an `<hr>` inside a `<p>` is not the tree you will get. A paragraph takes phrasing content, so the parser closes it at the line and opens a second one — the server sends one paragraph and the browser builds two, which mismatches on hydration. Put the row in a flex container instead of a paragraph.',
        );
      }),
    [],
  );

  return (
    <hr
      {...rest}
      ref={mergeRefs(el, rest.ref)}
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

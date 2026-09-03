import { useCallback, useLayoutEffect, useRef } from 'react';
import type { MouseEvent } from 'react';
import { cn } from '../../util/cn.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import type { TagListProps } from './tag-list.types.js';
import styles from './tag-list.module.css';

/** What a `Tag`'s remove control marks itself with, so this can find them all. */
const REMOVE = '[data-tag-remove]';

/**
 * The set a `Tag` belongs to — and the component that answers for the focus a
 * removal destroys.
 *
 *     <TagList label="Active filters">
 *       <Tag onRemove={() => drop('milano')}>Milano</Tag>
 *       <Tag onRemove={() => drop('torino')}>Torino</Tag>
 *     </TagList>
 *
 * WHY IT EXISTS AT ALL, since a `<ul>` with a class would do most of it. Press
 * the ✕ on the third of six tags and the button holding the focus stops
 * existing: the browser drops focus to `<body>`, and the next `Tab` starts the
 * page again from the top. A keyboard user clearing four filters is sent back
 * to the skip link four times. Nothing about that is visible to a mouse, which
 * is why it survives in so many design systems — and it cannot be fixed by the
 * tag, because by the time it is gone it has nothing left to move the focus
 * with. The set is the only thing still standing, so the set owns the recovery.
 *
 * WHERE IT PUTS THE FOCUS: the remove control that took the departing one's
 * place — the tag AFTER it, or the last one when the last was removed — so
 * clearing a list means pressing Enter repeatedly and watching it empty, which
 * is what a mouse user does. When the last tag goes, the list itself takes the
 * focus (`tabIndex={-1}`), the same rescue `AppLayoutNav` performs when the
 * form holding the focus is destroyed: focus stays where the reader was rather
 * than falling to the top of the document.
 *
 * WHAT IT DOES NOT DO. It moves nothing when the focus was not inside it — a
 * click in Safari, where a pressed button does not take focus, must not steal
 * it from wherever the reader actually is. And it moves nothing until the tag
 * is REALLY gone: the app may refuse a removal, or take a network round trip
 * over it, and this waits for the DOM rather than trusting the click.
 *
 * THERE IS NO ROVING TABSTOP. Every remove control is a real tab stop, which is
 * what ADR-0028 asks of the chips it promises ("removal is reachable from the
 * keyboard without a mouse") and what a list of a handful of tags actually
 * wants. The `grid` pattern that collapses them into one stop is for the
 * hundred-tag case, and it costs an interaction model a reader has to learn;
 * when something here holds hundreds, it will need its own decision.
 */
function TagList(props: TagListProps) {
  const { label, className, children, onClick, ref, ...rest } = props;

  const list = useRef<HTMLUListElement>(null);
  /** The control that was pressed, and where it stood. Null when nothing is going. */
  const going = useRef<{ node: Element; index: number } | null>(null);

  const controls = () =>
    Array.from(list.current?.querySelectorAll<HTMLElement>(REMOVE) ?? []);

  const handleClick = useCallback(
    (event: MouseEvent<HTMLUListElement>) => {
      onClick?.(event);

      const root = list.current;
      const control = (event.target as Element | null)?.closest?.<HTMLElement>(
        REMOVE,
      );
      if (root === null || control == null) return;

      // ONLY A FOCUS WE ARE ABOUT TO DESTROY. In Safari a pressed button does
      // not take the focus at all, so after a mouse click the reader's focus is
      // still wherever they left it — moving it into this list would be
      // stealing it. Keyboard activation always leaves focus on the button, so
      // the case that needs rescuing is exactly the case this admits.
      if (!root.contains(document.activeElement)) return;

      going.current = { node: control, index: controls().indexOf(control) };
    },
    [onClick],
  );

  // A LAYOUT EFFECT, so the focus lands before the browser paints: an ordinary
  // effect leaves one frame in which the focus ring is nowhere, and on a slow
  // commit that frame is visible.
  useLayoutEffect(() => {
    const pending = going.current;
    const root = list.current;
    if (pending === null || root === null) return;

    // STILL THERE means the app has not removed it — a refusal, or a removal
    // still in flight. Not our turn yet, and the record stays so the recovery
    // still happens whenever the tag actually goes.
    if (root.contains(pending.node)) return;
    going.current = null;

    const remaining = controls();
    const next = remaining[Math.min(pending.index, remaining.length - 1)];
    if (next !== undefined) {
      next.focus();
      return;
    }

    // Nothing left to stand on. The list keeps the focus rather than handing it
    // to `<body>`; a consumer who unmounts the whole list on the last removal
    // is choosing where focus goes themselves, which is theirs to choose.
    root.focus();
  });

  return (
    <ul
      // BEFORE THE SPREAD, the way every named region in this package does it:
      // a consumer with a better name — an `aria-labelledby` pointing at a
      // heading they already show — outranks this without having to fight it.
      aria-label={label}
      // Script-focusable only, for the rescue above. Before the spread, so a
      // consumer who wants the list in the tab order can say so.
      tabIndex={-1}
      {...rest}
      ref={mergeRefs(ref, list)}
      onClick={handleClick}
      className={cn(styles.list, className)}
    >
      {children}
    </ul>
  );
}

export { TagList };

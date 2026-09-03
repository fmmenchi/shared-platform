import { useCallback, useEffect, useRef } from 'react';
import type { MouseEvent } from 'react';
import { cn } from '../../util/cn.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { TagListContext, TAG_LIST } from './tag-list.context.js';
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
 * A MUTATION OBSERVER RATHER THAN A LAYOUT EFFECT, and the difference is not
 * academic. The first version hung the rescue on this component's own render —
 * and the state holding the tags does not have to live above it. Put the
 * `useState` in a component BETWEEN the list and the tags, which is a legal
 * composition since `Tag` renders the `<li>` and a wrapper adds no DOM, and
 * removing a tag re-renders only that wrapper: measured, the effect never ran,
 * the focus fell to `<body>`, and the component silently failed at the one job
 * it exists for. What the rescue waits for is a DOM mutation, so a DOM mutation
 * is what it observes. The callback runs at the microtask checkpoint of the
 * task that mutated, which is still before paint.
 *
 * WHAT IT DOES NOT DO — three refusals, each measured:
 *
 *   - it takes only a focus the removal DESTROYED, and it asks at the RESCUE
 *     rather than at the click. Between the two, a deferred removal gives the
 *     reader time to go somewhere else; the first version yanked them back from
 *     it. Focus on `<body>` — where the browser leaves it when it destroys the
 *     focused element — or still inside this list is ours to move. Anywhere
 *     else is somebody's;
 *   - it arms only for the control the reader was ON. Safari does not focus a
 *     pressed button, so a mouse click there must move nothing; asking merely
 *     whether the focus was somewhere in the list was one scope too wide, and
 *     dragged the focus off a DIFFERENT tag the reader had deliberately chosen;
 *   - it moves nothing until the tag is REALLY gone: the app may refuse a
 *     removal, or take a network round trip over it.
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

  /**
   * OUR controls, not every one below us. A grouped filter panel nests a list
   * per facet inside an outer one, and an unfiltered descendant sweep lets the
   * outer list compute a position over the union of both — then act on it. The
   * nearest `<ul>` above a control is the list that control belongs to.
   */
  const controls = useCallback(() => {
    const root = list.current;
    if (root === null) return [];
    return Array.from(root.querySelectorAll<HTMLElement>(REMOVE)).filter(
      (control) => control.closest('ul') === root,
    );
  }, []);

  const rescue = useCallback(() => {
    const pending = going.current;
    const root = list.current;
    if (pending === null || root === null) return;

    // STILL THERE means the app has not removed it — a refusal, or a removal
    // still in flight. Not our turn yet, and the record stays so the recovery
    // still happens whenever the tag actually goes.
    if (root.contains(pending.node)) return;
    going.current = null;

    // THE FOCUS WE ARE ENTITLED TO, asked here rather than at the click.
    const active = document.activeElement;
    if (active !== null && active !== document.body && !root.contains(active)) {
      return;
    }

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
  }, [controls]);

  const handleClick = useCallback(
    (event: MouseEvent<HTMLUListElement>) => {
      // ARMED BEFORE THE CONSUMER'S HANDLER RUNS, not after. Theirs may throw —
      // React 19 reports it and carries on — and the tag would still go, with
      // nothing recorded to rescue the focus from.
      const control = (event.target as Element | null)?.closest?.<HTMLElement>(
        REMOVE,
      );
      if (control != null && document.activeElement === control) {
        // `indexOf` is the containment check too: a control belonging to a
        // nested list is not in ours, so there is nothing here to arm for.
        const index = controls().indexOf(control);
        if (index !== -1) going.current = { node: control, index };
      }

      onClick?.(event);
    },
    [controls, onClick],
  );

  // THE TRIGGER IS A DOM MUTATION — see above. `subtree`, because the tag that
  // goes is one level down and a consumer's own components may wrap it.
  useEffect(() => {
    const root = list.current;
    if (root === null) return;
    const observer = new MutationObserver(rescue);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [rescue]);

  return (
    <ul
      // BEFORE THE SPREAD, the way every named region in this package does it:
      // a consumer with a better name — an `aria-labelledby` pointing at a
      // heading they already show — outranks this without having to fight it.
      aria-label={label}
      // EXPLICIT, because the stylesheet takes the markers off: WebKit drops
      // list semantics from a `list-style: none` list, so a `<ul>` styled like
      // this one is announced as a plain group in Safari and the count — the
      // whole reason these are a list — is never spoken. `Pagination` carries
      // the same attribute, for the same measured reason.
      role="list"
      // Script-focusable only, for the rescue above. Before the spread, so a
      // consumer who wants the list in the tab order can say so.
      tabIndex={-1}
      {...rest}
      ref={mergeRefs(ref, list)}
      onClick={handleClick}
      className={cn(styles.list, className)}
    >
      <TagListContext.Provider value={TAG_LIST}>
        {children}
      </TagListContext.Provider>
    </ul>
  );
}

export { TagList };

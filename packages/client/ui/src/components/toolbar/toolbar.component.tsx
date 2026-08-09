import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { FocusEvent, KeyboardEvent } from 'react';
import { cn } from '../../util/cn.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { useDescendants } from '../../primitives/use-descendants.js';
import { arrowTarget, directionOf, first } from '../../primitives/roving.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { ToolbarContext } from './toolbar.context.js';
import type { ToolbarContextValue } from './toolbar.context.js';
import { partition } from './toolbar.controls.js';
import type { ToolbarProps } from './toolbar.types.js';
import styles from './toolbar.module.css';

/** What a change to one of these means: the tab stop may belong elsewhere now. */
const WATCHED = ['disabled', 'tabindex', 'class', 'style', 'hidden', 'inert'];

/**
 * A set of controls that belong together, and one tab stop for all of them.
 *
 *     <Toolbar label="Text formatting">
 *       <ToolbarItem>
 *         <Button aria-pressed={bold} onClick={toggleBold}>Bold</Button>
 *       </ToolbarItem>
 *       <ToolbarItem>
 *         <Button aria-pressed={italic} onClick={toggleItalic}>Italic</Button>
 *       </ToolbarItem>
 *     </Toolbar>
 *
 * THE THIRD FAMILY WALKED BY THE ARROWS, and the first that does not own what
 * it walks. A menu has `MenuItem`s and a tab list has `Tab`s, both ours down to
 * the element; a toolbar's controls are the consumer's — a `Button`, a
 * `Checkbox`, something from their own codebase. So the part that joins the
 * family adds no element, no styling and no semantics: `ToolbarItem` clones the
 * control it is given and merges in a ref. Walking the ring is
 * `primitives/roving.ts`, which `TabList` and this now share down to the key
 * handling.
 *
 * WHY IT EXISTS AT ALL, since nine buttons in a `<div>` already work: they cost
 * nine stops on the way down the page. A toolbar is one, and the arrows move
 * inside it. That is the entire pattern; a bar that does not take the tab stops
 * over is a `<div>` with a role on it, and worse than nothing, because it tells
 * a screen reader to expect a keyboard it does not implement.
 *
 * NOT A NAVIGATION and not a `Menubar`. Links go in a `Nav`, where the browser's
 * own tab order is the right one. A bar of MENUS is a `Menubar`, a menu's family
 * without the surface.
 *
 * THE TAB STOP LIVES ON THE ELEMENTS, not in React state, and this is the one
 * decision here that differs from every other roving family in the package.
 * `Tabs` keeps a `tabStop` value and each `Tab` renders `tabindex` from it —
 * which it can, because it owns its parts and names them by `value`.
 *
 * This bar owns none of its controls, and the facts that decide the tab stop
 * are facts about the DOM: whether the control holding it is still mounted, and
 * whether it can still take the focus. Neither is visible to a render, and a
 * `useState` mirroring them would be the second copy this package's doctrine
 * warns about — kept honest only by an effect setting state after every commit,
 * which cascades by construction and which this workspace's lint rejects.
 *
 * SO THE FACT GOES ON THE ELEMENT — and the invalidation has to come from the
 * DOM too. That second half is what the first version of this file got wrong,
 * and it is worth writing down because the mistake is a comfortable one: it
 * recomputed from `useEffect(apply)` and its own comment claimed that ran
 * "after every commit". A passive effect with no dependency list runs after
 * every commit THAT RE-RENDERS THIS COMPONENT, which is not the same sentence.
 * Three reviews reproduced the same ending in a browser, from the most ordinary
 * way anyone writes a toolbar — one component per control, holding its own
 * state:
 *
 *     function UndoButton() {
 *       const canUndo = useEditorStore((s) => s.canUndo);
 *       return <ToolbarItem><Button disabled={!canUndo}>Undo</Button></ToolbarItem>;
 *     }
 *
 * When `canUndo` flips, only `UndoButton` re-renders. `Toolbar` does not, the
 * effect does not run, and the only `tabindex="0"` on the bar is left on a
 * `:disabled` element. Tab now skips the whole toolbar, and nothing on screen
 * says so. A control that unmounts itself ends the same way, and so does a
 * media query hiding the control that holds the stop — that one moves no React
 * tree at all.
 *
 * A fact kept on the DOM has to be invalidated BY the DOM, so the recompute is
 * driven by a `MutationObserver` on this subtree and a `ResizeObserver` on the
 * bar, not by React's render schedule. `apply` never loops through them: it
 * writes only where the attribute differs, so its own writes are observed once
 * and produce nothing.
 *
 * WHAT IT COSTS, said plainly, in two places.
 *
 * Before hydration nothing has written a `tabindex`, so every control is its
 * own tab stop — the bar degrades to what it would have been without
 * JavaScript, a row of ordinary working buttons.
 *
 * And `useDescendants` sells its read as costing a `querySelectorAll` "on a
 * keypress and not on a render" (0.05ms for 300 parts, measured there). This is
 * the one consumer that breaks that sentence: the read also happens on every
 * commit of the bar and on every mutation the observer reports. It is the price
 * of the invalidation being honest, it is bounded by the same measurement, and
 * it is written down here rather than left for the next person to discover from
 * a profile.
 */
function Toolbar(props: ToolbarProps) {
  const {
    label,
    orientation = 'horizontal',
    className,
    children,
    onKeyDown,
    onFocus,
    onBlur,
    ref,
    ...rest
  } = props;

  const items = useDescendants<undefined>();
  const bar = useRef<HTMLDivElement | null>(null);
  /** The control that holds the tab stop. A ref: nothing renders from it. */
  const holder = useRef<HTMLElement | null>(null);
  /** Whether the focus is somewhere inside this bar — for re-homing it. */
  const inside = useRef(false);

  const context = useMemo<ToolbarContextValue>(
    () => ({ items, orientation }),
    [items, orientation],
  );

  useDevWarning(
    label.trim() === '',
    'Toolbar: `label` is empty, so the bar is announced as just "toolbar". On a page with two of them that names neither.',
  );

  /**
   * Put the one tab stop where it belongs, and take it off everything else.
   *
   * Every call re-reads the family, so a control that has unmounted, been
   * disabled or been hidden since the last one simply is not in the answer —
   * there is no stale id to notice, because there is no id.
   */
  const apply = useCallback(() => {
    const all = items.items();
    const { ring, fields } = partition(all);

    const previous = holder.current;
    const kept =
      previous && ring.some((item) => item.element === previous)
        ? previous
        : first(ring);
    holder.current = kept;

    for (const item of all) {
      // A field keeps a stop of ITS own — it is off the ring, reached and left
      // with Tab, which is the APG's answer for a control that wants the
      // arrows. Everything else is the one holder, or nothing.
      const want = fields.includes(item) || item.element === kept ? '0' : '-1';
      // Only when it differs. Not a micro-optimisation: this is what keeps the
      // observer below from seeing its own writes and calling this again.
      if (item.element.getAttribute('tabindex') !== want) {
        item.element.setAttribute('tabindex', want);
      }
    }

    // THE BAR IS THE FALLBACK, and only that. A bar whose controls are all
    // gated by a permission, still loading, or hidden at a breakpoint has
    // nothing to put the stop on; it keeps the focus and shows a ring, because
    // a tab stop nobody can see is worse than one nobody wanted. Written here
    // rather than rendered, so React never puts it back.
    //
    // GUARDED LIKE THE REST, and this one is not an optimisation either — it is
    // the difference between working and hanging the tab. `setAttribute`
    // records a mutation even when the value it writes is the value already
    // there, so an unconditional write here fed the observer below its own
    // output forever. The first run of this file never finished.
    if (bar.current) {
      const want = kept === null && fields.length === 0 ? '0' : '-1';
      if (bar.current.getAttribute('tabindex') !== want) {
        bar.current.setAttribute('tabindex', want);
      }
    }

    // THE FOCUS FOLLOWS THE STOP WHEN THE GROUND GOES. Removing or disabling
    // the focused control drops the focus to `<body>`, which restarts the next
    // Tab at the top of the document and loses a screen reader's place
    // entirely. Guarded three ways so it can never STEAL the focus: the bar
    // must have had it, the holder must have actually changed, and nothing else
    // may have claimed it in the meantime.
    if (
      inside.current &&
      previous !== null &&
      previous !== kept &&
      document.activeElement === document.body
    ) {
      kept?.focus();
    }
  }, [items]);

  // DRIVEN BY THE DOM, because that is where the fact lives. `subtree` because
  // a control is not a direct child of the bar; the attribute list is every way
  // a control stops being able to hold the stop. `ResizeObserver` catches the
  // one thing mutations cannot see: a media or container query changing which
  // controls are laid out at all, which moves no React tree and mutates no
  // attribute.
  useEffect(() => {
    const node = bar.current;
    if (!node) return;

    apply();

    const observer = new MutationObserver(apply);
    observer.observe(node, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: WATCHED,
    });

    const resize = new ResizeObserver(apply);
    resize.observe(node);

    // The bar can be full-width, in which case a control leaving at a
    // breakpoint changes nothing about its box and the `ResizeObserver` stays
    // silent. The viewport is what the media query actually watched.
    window.addEventListener('resize', apply);

    return () => {
      observer.disconnect();
      resize.disconnect();
      window.removeEventListener('resize', apply);
    };
  }, [apply]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event);
      // A key something inside has already answered is not the bar's — an open
      // menu's own arrows, the Escape that closes it, a consumer's handler that
      // meant it.
      if (event.defaultPrevented) return;

      const focused = document.activeElement as HTMLElement | null;
      const { ring } = partition(items.items());
      const from = ring.findIndex((item) => item.element === focused);
      // NOT FROM A CONTROL ON THE RING, so not ours. `step` reads a negative
      // index as "nowhere yet", which is right for a menu that has just opened
      // and wrong for a handler catching everything that bubbles out of the
      // bar. This is also what leaves a field's arrows alone: a field is off
      // the ring by construction, so its keys never reach the walk at all.
      if (from < 0) return;

      const target = arrowTarget(ring, from, event.key, {
        orientation,
        direction: directionOf(event.currentTarget),
      });
      if (!target) return;

      // Ours now: the arrows would otherwise also scroll the page, and Home/End
      // would jump the document out from under the reader.
      event.preventDefault();
      target.focus();
    },
    [onKeyDown, items, orientation],
  );

  const handleFocus = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      onFocus?.(event);
      inside.current = true;

      // The bar itself, which happens when no control carries the tab stop —
      // and also when a pointer lands on the bar's own padding, since a
      // `tabindex="-1"` element is click-focusable. Handed on to where the user
      // WAS, not to the first control: a toolbar is not somewhere to stand, and
      // sending them back to the start would discard every arrow they pressed.
      if (event.target === event.currentTarget) {
        (holder.current ?? first(partition(items.items()).ring))?.focus();
        return;
      }

      // THE TAB STOP FOLLOWS THE FOCUS, read off the event rather than reported
      // by the part. `focusin` bubbles, so one listener here sees every control
      // take the focus however it happened — arrow, click, or a consumer's own
      // `focus()` call — and `ToolbarItem` is left owing nothing but its ref.
      // Cloning an `onFocus` onto the control would have REPLACED the one it
      // came with, the defect the Tooltip's trigger documents at length.
      const target = event.target as HTMLElement;
      if (!items.items().some((item) => item.element === target)) return;
      holder.current = target;
      apply();
    },
    [onFocus, items, apply],
  );

  const handleBlur = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      onBlur?.(event);
      // Only when the focus has gone somewhere REAL and outside. A `null`
      // relatedTarget is what a removed element leaves behind, and treating
      // that as "the user left" is what would stop `apply` from re-homing the
      // focus in the one case it exists for.
      const next = event.relatedTarget as Node | null;
      if (next && !event.currentTarget.contains(next)) inside.current = false;
    },
    [onBlur],
  );

  return (
    <ToolbarContext.Provider value={context}>
      <div
        // Before the spread: a page may hold more than one bar, and a name is
        // the one thing only the consumer can supply.
        aria-label={label}
        {...rest}
        ref={mergeRefs(items.rootRef, bar, ref)}
        role="toolbar"
        // Horizontal is what `role="toolbar"` already means, so saying it again
        // is noise; vertical is the one that has to be said.
        aria-orientation={orientation === 'vertical' ? 'vertical' : undefined}
        // The hook a consumer's own stylesheet can read, on the element they
        // were given — a hashed class from this file could not be named from
        // theirs.
        data-orientation={orientation}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={cn(styles.toolbar, className)}
      >
        {children}
      </div>
    </ToolbarContext.Provider>
  );
}

export { Toolbar };

import { useEffect, useId, useRef, useState } from 'react';
import { useMessages } from '../../i18n/provider.js';
import { cn } from '../../util/cn.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { VisuallyHidden } from '../visually-hidden/visually-hidden.component.js';
import { tableColumnResizerMessages } from './table-column-resizer.messages.js';
import type { TableColumnResizerProps } from './table-column-resizer.types.js';
import styles from './table-column-resizer.module.css';

/** One arrow press, and one with `Shift` held. */
const STEP = 16;
const BIG_STEP = 64;

/** Below this a press is a CLICK, not a drag — a hand is never perfectly still. */
const SLOP = 4;

/**
 * The border between two columns, made draggable — and made reachable by the
 * two groups a draggable border leaves out.
 *
 * THERE IS NO APG PATTERN FOR THIS, and that is worth saying rather than
 * discovering. The nearest is Window Splitter, which divides two panes; every
 * accessible column-resize implementation in the wild is a `grid`, where the
 * arrow keys belong to the component and a handle costs nothing. This table is
 * not a grid on purpose (ADR-0016), so the handle costs a tab stop, and the
 * splitter is the pattern its keyboard borrows: a focusable `separator` with a
 * value, moved by arrows.
 *
 * IT IS OPERABLE WITHOUT DRAGGING, and that is not a nicety — WCAG 2.5.7 asks
 * for a single-pointer path that is not a drag, and a keyboard does not satisfy
 * it: the criterion exists for people who use a pointer and cannot hold a
 * button while moving it. So a CLICK latches the handle: the pointer then moves
 * the border with nothing held, and the next press finishes it. `Escape`
 * cancels and puts the column back.
 *
 * IT PAINTS ITS OWN GESTURE. A width is a number the browser recomputes sixty
 * times a second, and routing that through React re-renders every row in the
 * table to move one border. The gesture writes the cell's inline size directly
 * and reports ONE intent when it ends — the shape the filter's Apply has, for
 * the same reason.
 *
 * THE GESTURE IS A REF, THE APPEARANCE IS STATE, and the split is load-bearing:
 * listeners attached by an effect keyed on state are attached one commit late,
 * so the first frames of a real drag are dropped and a synchronous sequence
 * misses the gesture entirely (measured — the first version did).
 */
function TableColumnResizer({
  label,
  min = 48,
  onResize,
  onReset,
  className,
  ref,
  ...rest
}: TableColumnResizerProps) {
  const t = useMessages(tableColumnResizerMessages);
  const handle = useRef<HTMLDivElement>(null);
  const hintId = useId();

  // WHAT THE COLUMN CURRENTLY MEASURES, and only the DOM can answer it: the
  // width in force may be a declaration, a share of what was left over, or the
  // last gesture. Invalidated by the DOM as well — props would not hear the
  // window resize that changed it.
  const [width, setWidth] = useState<number | null>(null);
  const [limit, setLimit] = useState<number | null>(null);

  /** What the reader is doing, readable the instant it changes. */
  const phase = useRef<'idle' | 'drag' | 'adjust'>('idle');
  /** The same fact, for the parts that are painted rather than computed. */
  const [mode, setMode] = useState<'idle' | 'drag' | 'adjust'>('idle');

  const anchor = useRef<{ x: number; width: number; original: number } | null>(
    null,
  );
  // While the gesture paints straight to the DOM, the observer below would
  // re-render this component every frame to report a number nobody is reading
  // yet. It re-reads once the gesture ends.
  const painting = useRef(false);
  const detach = useRef<(() => void) | null>(null);

  useEffect(() => {
    const cell = handle.current?.closest('th');
    if (cell == null) return;

    const sync = () => {
      if (painting.current) return;
      setWidth(Math.round(cell.getBoundingClientRect().width));
      const table = cell.closest('table');
      setLimit(
        table == null ? null : Math.round(table.getBoundingClientRect().width),
      );
    };

    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(cell);
    return () => observer.disconnect();
  }, []);

  // The listeners outlive a render but not the component.
  useEffect(() => () => detach.current?.(), []);

  const step = (delta: number) => {
    const cell = handle.current?.closest('th');
    if (cell == null) return;
    onResize(
      Math.max(min, Math.round(cell.getBoundingClientRect().width) + delta),
    );
  };

  const begin = (event: {
    clientX: number;
    pointerId: number;
    preventDefault: () => void;
  }) => {
    const node = handle.current;
    const cell = node?.closest('th');
    if (node == null || cell == null) return;

    // Or the press selects the heading beside it and the gesture paints a blue
    // smear across the table.
    event.preventDefault();

    // READ AT THE GESTURE, not at mount: a page can change direction under a
    // component that is already mounted, and in `rtl` the trailing edge is on
    // the left, so the same travel means the opposite width.
    const sign = getComputedStyle(node).direction === 'rtl' ? -1 : 1;
    const current = cell.getBoundingClientRect().width;
    anchor.current = { x: event.clientX, width: current, original: current };
    phase.current = 'drag';
    setMode('drag');
    node.setPointerCapture(event.pointerId);

    const paint = (next: number) => {
      painting.current = true;
      cell.style.inlineSize = `${next}px`;
      node.setAttribute('aria-valuenow', String(next));
    };

    const settle = () => {
      painting.current = false;
      anchor.current = null;
      phase.current = 'idle';
      setMode('idle');
      detach.current?.();
    };

    const commit = () => {
      const from = anchor.current;
      const next = Math.round(cell.getBoundingClientRect().width);
      const original = from == null ? next : Math.round(from.original);
      settle();
      // NOTHING MOVED, NOTHING REPORTED. Not merely redundant: a double-click
      // arrives as a press that never travelled, and reporting the width it
      // started at would overwrite the declaration the second click restores.
      if (next !== original) onResize(next);
    };

    const cancel = () => {
      const from = anchor.current;
      if (from != null)
        cell.style.inlineSize = `${Math.round(from.original)}px`;
      settle();
    };

    const move = (moved: PointerEvent) => {
      const from = anchor.current;
      if (from == null) return;
      paint(
        Math.max(min, Math.round(from.width + (moved.clientX - from.x) * sign)),
      );
    };

    const up = (released: PointerEvent) => {
      if (phase.current !== 'drag') return;
      const from = anchor.current;
      // A PRESS THAT NEVER TRAVELLED IS A CLICK, and a click is the entrance to
      // the drag-free mode rather than a resize of zero.
      if (from != null && Math.abs(released.clientX - from.x) < SLOP) {
        anchor.current = { ...from, x: released.clientX };
        phase.current = 'adjust';
        setMode('adjust');
        return;
      }
      commit();
    };

    const down = (pressed: PointerEvent) => {
      // The press that ENDS the latched mode. `pointerdown` and not `click`,
      // because the click that began the mode has not been dispatched yet and
      // would have ended it on arrival.
      if (phase.current !== 'adjust') return;
      pressed.preventDefault();
      commit();
    };

    const key = (pressed: KeyboardEvent) => {
      if (pressed.key !== 'Escape') return;
      pressed.preventDefault();
      cancel();
    };

    // ATTACHED HERE, synchronously. An effect keyed on the mode attaches one
    // commit later, which drops the opening frames of a real drag.
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointerdown', down, { capture: true });
    document.addEventListener('keydown', key);
    detach.current = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointerdown', down, { capture: true });
      document.removeEventListener('keydown', key);
      detach.current = null;
    };
  };

  return (
    <>
      <div
        {...rest}
        ref={mergeRefs(handle, ref)}
        // A FOCUSABLE SEPARATOR, which is what a window splitter is — the one
        // role in ARIA that means "a divider the user can move", and it takes a
        // value while it is at it.
        role="separator"
        aria-orientation="vertical"
        tabIndex={0}
        aria-label={t('name', { column: label })}
        // The two paths nobody can see. A criterion satisfied by a route the
        // reader cannot find is satisfied on paper only.
        aria-describedby={hintId}
        aria-valuenow={width ?? undefined}
        aria-valuemin={min}
        aria-valuemax={limit ?? undefined}
        aria-valuetext={
          width === null ? undefined : t('value', { width: String(width) })
        }
        data-mode={mode === 'idle' ? undefined : mode}
        className={cn(styles.resizer, className)}
        onPointerDown={(event) => {
          if (event.button !== 0 || phase.current !== 'idle') return;
          begin(event);
        }}
        onDoubleClick={() => onReset?.()}
        onKeyDown={(event) => {
          const node = handle.current;
          if (node == null) return;
          const wider =
            getComputedStyle(node).direction === 'rtl'
              ? 'ArrowLeft'
              : 'ArrowRight';
          const amount = event.shiftKey ? BIG_STEP : STEP;

          if (event.key === wider) {
            event.preventDefault();
            step(amount);
          } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            step(-amount);
          } else if (event.key === 'Home') {
            event.preventDefault();
            onResize(min);
          } else if (event.key === 'End' && limit !== null) {
            event.preventDefault();
            onResize(limit);
          } else if (event.key === 'Enter') {
            event.preventDefault();
            onReset?.();
          }
        }}
      />
      <VisuallyHidden id={hintId}>{t('hint')}</VisuallyHidden>
      {/* The latched mode is a MODE, and a mode nobody is told about is the
          defect the toolbar's silent clear already was. Empty until it happens,
          because a region that arrives populated is not announced. */}
      <VisuallyHidden role="status">
        {mode === 'adjust' ? t('adjusting', { column: label }) : ''}
      </VisuallyHidden>
    </>
  );
}

export { TableColumnResizer };

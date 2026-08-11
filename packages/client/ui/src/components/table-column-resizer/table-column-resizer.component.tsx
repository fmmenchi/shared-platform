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

interface Gesture {
  /** The pointer that started it. Anything else is somebody else's finger. */
  id: number;
  /** Where it started, and how wide the column was there. */
  x: number;
  width: number;
  /** What to report against, so an unmoved gesture reports nothing. */
  original: number;
  /** The inline size React had written, verbatim — `''` when it wrote none. */
  before: string;
  /** The last width painted, which is what the reader chose. */
  painted: number | null;
  /** The widest this column may become without erasing the others. */
  max: number;
}

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
  controls,
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

  const gesture = useRef<Gesture | null>(null);
  // While the gesture paints straight to the DOM, the observer below would
  // re-render this component every frame to report a number nobody is reading
  // yet. It re-reads once the gesture ends — which it must do explicitly,
  // because the committed width is the one already on screen, so no further
  // resize happens and the observer never fires again.
  const painting = useRef(false);
  const detach = useRef<(() => void) | null>(null);
  /** The running gesture's own cancel, for the key handler on the element. */
  const escape = useRef<(() => void) | null>(null);

  /**
   * THE WIDEST THIS COLUMN MAY BE, which is not the table's width. Under
   * `table-layout: fixed` a column given the whole table takes it: measured,
   * `End` on a three-column table left `[968, 0, 0]` and the other two columns
   * rendered nothing, with `Escape` no help and `Enter` — the only way back —
   * named nowhere the reader could see it. The ceiling leaves every other
   * column its own minimum.
   */
  const ceiling = (cell: HTMLTableCellElement) => {
    const table = cell.closest('table');
    if (table == null) return null;
    const others = Math.max((cell.parentElement?.children.length ?? 1) - 1, 0);
    return Math.max(
      min,
      Math.round(table.getBoundingClientRect().width) - others * min,
    );
  };

  const measure = () => {
    const cell = handle.current?.closest('th');
    if (cell == null) return;
    setWidth(Math.round(cell.getBoundingClientRect().width));
    setLimit(ceiling(cell));
  };

  useEffect(() => {
    const cell = handle.current?.closest('th');
    if (cell == null) return;

    const sync = () => {
      if (painting.current) return;
      setWidth(Math.round(cell.getBoundingClientRect().width));
      setLimit(ceiling(cell));
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
    gesture.current = {
      id: event.pointerId,
      x: event.clientX,
      width: current,
      original: current,
      // VERBATIM, so a cancel can put back exactly what React wrote — `'40%'`,
      // or `''` for a column that declared nothing. Writing the measured pixels
      // back instead left a fixed width on a relative column that React then
      // never overwrote, because its own prop had not changed: the column
      // silently stopped following its container, which is the conversion the
      // dev warning promises only a completed drag can cause.
      before: cell.style.inlineSize,
      painted: null,
      // CAPTURED AT THE GESTURE, because `limit` is state and the closures
      // below outlive the render that made them.
      max: ceiling(cell) ?? Number.POSITIVE_INFINITY,
    };
    phase.current = 'drag';
    setMode('drag');

    /** Clamped at BOTH ends: `aria-valuenow` outside its own range is a lie. */
    const clamp = (next: number) => {
      const from = gesture.current;
      return Math.max(min, Math.min(from?.max ?? next, next));
    };

    const paint = (raw: number) => {
      const from = gesture.current;
      if (from == null) return;
      const next = clamp(raw);
      painting.current = true;
      from.painted = next;
      cell.style.inlineSize = `${next}px`;
      node.setAttribute('aria-valuenow', String(next));
      // BOTH, and the second was missing. `aria-valuetext` takes precedence
      // over `aria-valuenow` in the ARIA value computation, so writing only the
      // number left the handle announcing the width it had before the gesture
      // — during it, and then permanently, because the committed width is
      // already on screen and nothing makes the observer fire again.
      node.setAttribute('aria-valuetext', t('value', { width: String(next) }));
    };

    /** Where the border would be if the pointer were here. */
    const widthAt = (clientX: number) => {
      const from = gesture.current;
      if (from == null) return null;
      return clamp(Math.round(from.width + (clientX - from.x) * sign));
    };

    const settle = () => {
      phase.current = 'idle';
      gesture.current = null;
      painting.current = false;
      setMode('idle');
      detach.current?.();
      // The observer was told to stay quiet for the whole gesture, and the
      // width that ends it is already on screen — so nothing will make it fire.
      // Without this `aria-valuetext` kept reporting the width from BEFORE the
      // drag, and took precedence over the `aria-valuenow` the gesture wrote.
      measure();
    };

    const commit = () => {
      const from = gesture.current;
      // WHAT WAS PAINTED, not what it measures now: under `table-layout: fixed`
      // a column the table cannot give the asked-for width measures back as
      // something else, and reporting that discards the reader's choice.
      const next =
        from?.painted ?? Math.round(cell.getBoundingClientRect().width);
      const original = from == null ? next : Math.round(from.original);
      const untouched = from?.painted === null;
      // NOTHING MOVED, NOTHING REPORTED — and the cell goes back to React's own
      // declaration rather than keeping a pixel value nobody asked for. A
      // double-click arrives as a press that never travelled, and reporting the
      // width it started at would overwrite the declaration the second click is
      // about to restore.
      if (untouched || next === original) {
        if (from != null) cell.style.inlineSize = from.before;
        settle();
        return;
      }
      settle();
      onResize(next);
    };

    const cancel = () => {
      const from = gesture.current;
      if (from != null) cell.style.inlineSize = from.before;
      settle();
    };
    escape.current = cancel;

    /** Somebody else's finger, mid-drag. */
    const mine = (event: PointerEvent) =>
      phase.current !== 'drag' || event.pointerId === gesture.current?.id;

    const move = (moved: PointerEvent) => {
      const from = gesture.current;
      if (from == null || !mine(moved)) return;
      const next = widthAt(moved.clientX);
      if (next !== null) paint(next);
    };

    const up = (released: PointerEvent) => {
      if (phase.current !== 'drag' || !mine(released)) return;
      const from = gesture.current;
      // A PRESS THAT NEVER TRAVELLED IS A CLICK, and a click is the entrance to
      // the drag-free mode rather than a resize of zero.
      if (from != null && Math.abs(released.clientX - from.x) < SLOP) {
        from.x = released.clientX;
        from.width = Math.round(cell.getBoundingClientRect().width);
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
      // STOPPED HERE, and this is the difference between a mode you can leave
      // and one you cannot. The border follows the pointer, so the handle is
      // UNDER the pointer when the reader presses to finish — and without this
      // the same event went on to the handle's own `pointerdown`, which found
      // the gesture settled and started a new one, which then re-latched on
      // release. Measured: the column followed the mouse around the page for
      // as long as the page was open.
      pressed.stopPropagation();
      // The `click` the browser will build from this press is not ours to
      // deliver either: measured, finishing over a row activated that row's
      // control and took the focus. Swallowed once, and given up on shortly
      // after in case no click follows — a listener waiting forever would eat
      // somebody else's.
      const swallow = (clicked: Event) => {
        clicked.preventDefault();
        clicked.stopPropagation();
      };
      document.addEventListener('click', swallow, {
        capture: true,
        once: true,
      });
      setTimeout(() => {
        document.removeEventListener('click', swallow, { capture: true });
      }, 400);

      // A press that is not the primary button is a menu, not a decision, and
      // a press outside the table is somebody going elsewhere.
      const table = cell.closest('table');
      const target = pressed.target;
      const inside =
        target instanceof Node && table !== null && table.contains(target);
      if (pressed.button !== 0 || !inside) {
        cancel();
        return;
      }

      // THE PRESS PLACES THE BORDER, and that is what makes this reachable
      // WITHOUT A POINTER THAT HOVERS. The first version moved the border on
      // `pointermove` and used this press only to stop — which a finger cannot
      // do, because a touch pointer only moves while it is touching and
      // touching IS the drag. Measured on a real touchscreen: the tap latched,
      // the reader was told to "move the pointer", and the second tap committed
      // the width unchanged. Placing from the press is WCAG's own example of a
      // non-drag path — click the thing, then click where it goes — and it is
      // the same gesture with a mouse.
      const next = widthAt(pressed.clientX);
      if (next !== null) paint(next);
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
    // THE ONE THE FIRST VERSION FORGOT. A cancelled pointer — the browser
    // taking over for a scroll, a system gesture, the window losing the device
    // — fires neither `pointerup` nor anything else, so the gesture never
    // ended: the handle stayed dead for the life of the mount, the observer
    // stayed suppressed, and a later pointermove still repainted the column.
    document.addEventListener('pointercancel', cancel);
    document.addEventListener('pointerdown', down, { capture: true });
    document.addEventListener('keydown', key);
    detach.current = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', cancel);
      document.removeEventListener('pointerdown', down, { capture: true });
      document.removeEventListener('keydown', key);
      detach.current = null;
    };

    // AFTER the listeners, and guarded. It throws on a stale pointer id or a
    // disconnected node, and thrown from before the teardown existed it left a
    // gesture nothing could end.
    try {
      node.setPointerCapture(event.pointerId);
    } catch {
      // Capture is an optimisation here: the document listeners already see
      // every move. Nothing to do.
    }
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
        // WHAT IT DIVIDES, which the splitter pattern asks for: the head of the
        // column, because that is the element on screen that IS the column.
        aria-controls={controls}
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
          } else if (event.key === 'Escape' && phase.current !== 'idle') {
            // The gesture's own listener is on the document and only exists
            // while a gesture does; this is the same key reaching the same
            // decision from the element, for a reader who latched with the
            // pointer and then reached for the keyboard.
            event.preventDefault();
            escape.current?.();
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

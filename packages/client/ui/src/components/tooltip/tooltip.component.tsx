import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type Ref,
} from 'react';
import { cn } from '../../util/cn.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { useAnchored } from '../../primitives/use-anchored.js';
import { tooltipVariants } from './tooltip.variants.js';
import type { TooltipProps } from './tooltip.types.js';

/**
 * A short label that appears beside its trigger on hover and on keyboard focus.
 *
 *     <Tooltip content="Delete">
 *       <Button aria-label="Delete">…</Button>
 *     </Tooltip>
 *
 * It is a **description**, not a name: the trigger keeps its own accessible name
 * and gains `aria-describedby`. If a tooltip is the only text an icon button
 * has, that button is missing an `aria-label` — a tooltip cannot stand in for
 * one, because on touch it does not exist at all.
 *
 * What it owes, and what most tooltips get wrong (WCAG 1.4.13):
 *
 * - **dismissible** — `Escape` closes it and the focus does not move;
 * - **hoverable** — it survives the pointer travelling towards it, which is what
 *   `closeDelay` buys;
 * - **persistent** — it stays while the pointer or the focus stays.
 *
 * The surface is always in the DOM and hidden when closed, so `aria-describedby`
 * always resolves: a reference to an element that does not exist yet is a
 * description no screen reader ever reads.
 *
 * Where the engine has the Popover API the surface is also promoted to the top
 * layer, which is the only thing that keeps it out of an ancestor's
 * `overflow: hidden`. Where it does not, the tooltip still appears — just
 * clippable. The layer is the enhancement; the visibility never is.
 */
function Tooltip(props: TooltipProps) {
  const {
    content,
    children,
    placement = 'top',
    openDelay = 400,
    closeDelay = 120,
  } = props;

  // Without this the failure is a TypeError from inside `cloneElement`, which
  // names neither the component nor the mistake.
  if (!isValidElement(children)) {
    throw new Error(
      'Tooltip: `children` must be a single element that accepts a ref and spreads its props.',
    );
  }

  const id = useId();
  const surfaceRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // A click presses, then focuses. Without remembering the press, the focus that
  // follows reopens what the press just closed — and `:focus-visible` does not
  // settle it, because a programmatic `.focus()` can match it too.
  const pressed = useRef(false);
  const [open, setOpen] = useState(false);
  // STATE, not a ref: both the listeners below and the measurement have to run
  // again when the trigger node changes, and a ref would never tell them it had.
  const [triggerNode, setTriggerNode] = useState<HTMLElement | null>(null);
  const [pendingOpen, setPendingOpen] = useState(false);

  // DECLARED BEFORE the measurement, because effects run in declaration order
  // and the UA keeps a closed popover at `display: none`: measuring first would
  // position an empty box, and the first open would land in the wrong place.
  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface || !('showPopover' in surface)) return;
    const shown = surface.matches(':popover-open');
    if (open && !shown) surface.showPopover();
    if (!open && shown) surface.hidePopover();
  }, [open]);

  useAnchored(triggerNode, surfaceRef, { placement, open });

  // `useCallback` here is not memoisation for its own sake: `react-hooks/refs`
  // reads a ref touched inside a function CREATED during render as a ref touched
  // during render, and cannot tell that these only ever run from an event.
  const schedule = useCallback((next: boolean, delay: number) => {
    clearTimeout(timer.current);
    // Tracked because `Escape` must be able to cancel an open that has been
    // asked for and not yet happened: measured, pressing it 60ms into a 400ms
    // `openDelay` used to be ignored and the tooltip appeared anyway.
    setPendingOpen(next);
    timer.current = setTimeout(() => {
      setPendingOpen(false);
      setOpen(next);
    }, delay);
  }, []);

  const closeNow = useCallback(() => {
    clearTimeout(timer.current);
    setPendingOpen(false);
    setOpen(false);
  }, []);

  // The trigger's listeners are NATIVE, added to the node itself, and that is
  // the whole composition story: `cloneElement` props REPLACE the child's, so a
  // trigger with its own `onFocus` would have silently lost it — the same defect
  // the form ports had with a plain spread, in different clothes. Composing by
  // hand is possible but easy to forget one; `addEventListener` is additive by
  // construction, so the trigger's handlers were never in our way to begin with.
  useEffect(() => {
    if (!triggerNode) return;

    const release = () => {
      pressed.current = false;
    };
    const onPointerEnter = () => {
      release();
      schedule(true, openDelay);
    };
    const onPointerLeave = () => {
      release();
      // Focus outlives the pointer. Measured: tabbing to a trigger and then
      // brushing the mouse over it dismissed what the keyboard had opened,
      // which is the "persistent" half of WCAG 1.4.13 broken.
      if (triggerNode.matches(':focus-visible')) return;
      schedule(false, closeDelay);
    };
    const onPointerDown = () => {
      pressed.current = true;
      closeNow();
    };
    const onFocus = (event: FocusEvent) => {
      if (pressed.current) return;
      if ((event.target as HTMLElement).matches(':focus-visible'))
        setOpen(true);
    };
    const onBlur = () => {
      release();
      // …and the pointer outlives the focus, for the same reason.
      if (triggerNode.matches(':hover')) return;
      schedule(false, closeDelay);
    };

    triggerNode.addEventListener('pointerenter', onPointerEnter);
    triggerNode.addEventListener('pointerleave', onPointerLeave);
    triggerNode.addEventListener('pointerdown', onPointerDown);
    triggerNode.addEventListener('focus', onFocus);
    triggerNode.addEventListener('blur', onBlur);
    return () => {
      triggerNode.removeEventListener('pointerenter', onPointerEnter);
      triggerNode.removeEventListener('pointerleave', onPointerLeave);
      triggerNode.removeEventListener('pointerdown', onPointerDown);
      triggerNode.removeEventListener('focus', onFocus);
      triggerNode.removeEventListener('blur', onBlur);
    };
  }, [triggerNode, schedule, closeNow, openDelay, closeDelay]);

  // The SURFACE's listeners are native for a reason of its own, and this one was
  // measured: React's synthetic `pointerenter` never fired when the pointer
  // travelled from the trigger onto the surface with a real mouse — only under
  // `user-event`, which dispatches the event straight at the element. The test
  // suite said hoverable; a real pointer said the tooltip vanished under it.
  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;

    const stay = () => schedule(true, 0);
    const leave = () => schedule(false, closeDelay);

    surface.addEventListener('pointerenter', stay);
    surface.addEventListener('pointerleave', leave);
    return () => {
      surface.removeEventListener('pointerenter', stay);
      surface.removeEventListener('pointerleave', leave);
    };
  }, [schedule, closeDelay]);

  useEffect(() => () => clearTimeout(timer.current), []);

  // Escape must dismiss without moving focus, from wherever the user is — hence
  // the document and not the trigger: with a tooltip open the focus may sit
  // anywhere, and a handler on the trigger would never hear it.
  useEffect(() => {
    // `pendingOpen` too: an open that has been asked for is a thing to dismiss.
    // Nothing else — otherwise merely hovering a trigger would eat the user's
    // Escape.
    if (!open && !pendingOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // The Escape is SPENT here. Measured: without this, dismissing a tooltip
      // inside a modal `<dialog>` closed the dialog as well — one keypress,
      // two dismissals, and the user loses the thing they were working in.
      event.preventDefault();
      event.stopPropagation();
      closeNow();
    };

    // Capture, so no handler between the document and the trigger acts on an
    // Escape that was ours to answer.
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [open, pendingOpen, closeNow]);

  // A trigger that swallows the ref makes the whole component a no-op: nothing
  // opens, nothing is described, and nothing is logged. It cannot be told apart
  // from a ref that has not arrived yet by looking once — measured, the first
  // effect pass reads `null` for a perfectly good trigger and the second reads
  // the node — so the question is asked one task later, which is after React
  // has flushed the update the ref callback scheduled.
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || triggerNode) return;
    const check = setTimeout(() => {
      console.warn(
        'Tooltip: the trigger never received a ref, so the tooltip cannot open ' +
          'or describe anything. `children` must be a component that forwards ' +
          'its `ref` to the DOM element it renders.',
      );
    });
    return () => clearTimeout(check);
  }, [triggerNode]);

  // The two ways a tooltip is misused even when it works, both of which fail in
  // silence. They need the mounted node — an accessible name is a DOM question,
  // not a props one — so this is an effect rather than `useDevWarning`.
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || !triggerNode) return;

    // Text inside `aria-hidden` does not name anything, and an icon marked that
    // way is precisely the trigger that ships nameless — so it is stripped
    // before asking. A copy, because the real trigger is not ours to touch.
    const visible = triggerNode.cloneNode(true) as HTMLElement;
    for (const hidden of visible.querySelectorAll('[aria-hidden="true"]')) {
      hidden.remove();
    }

    const label =
      triggerNode.getAttribute('aria-label')?.trim() ||
      visible.textContent?.trim() ||
      '';
    const labelledBy = triggerNode.getAttribute('aria-labelledby');

    if (!label && !labelledBy) {
      console.warn(
        'Tooltip: the trigger has no accessible name. A tooltip is a description, ' +
          'not a name — on touch it never appears, so this control is nameless. ' +
          'Give the trigger an `aria-label`.',
      );
    } else if (label && label === content.trim()) {
      console.warn(
        `Tooltip: \`content\` repeats the trigger's accessible name ("${label}"), ` +
          'so a screen reader announces it twice. Either describe something the ' +
          'name does not say, or drop the tooltip.',
      );
    }
  }, [triggerNode, content]);

  // `children.props.ref`, not `children.ref`: in React 19 the ref IS a regular
  // prop, and reading the old field warns on every render.
  const childProps = children.props as Record<string, unknown> & {
    'aria-describedby'?: string;
    ref?: Ref<HTMLElement>;
  };
  const childRef = childProps.ref;

  // The state setter IS a callback ref, so the trigger node needs no ref of our
  // own — which is also what keeps this out of the React Compiler's way: a ref
  // handed to a plain function during render counts as a ref read, and it is
  // right to say so.
  const triggerRef = useMemo(
    () => mergeRefs<HTMLElement>(setTriggerNode, childRef),
    [childRef],
  );

  const trigger = cloneElement(children, {
    ref: triggerRef,
    'aria-describedby': cn(childProps['aria-describedby'], id),
  } as Record<string, unknown>);

  return (
    <>
      {trigger}
      <div
        ref={surfaceRef}
        id={id}
        role="tooltip"
        popover="manual"
        data-open={open ? '' : undefined}
        className={cn(tooltipVariants())}
      >
        {content}
      </div>
    </>
  );
}

export { Tooltip };

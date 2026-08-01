import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type Ref,
} from 'react';
import { cn } from '../../util/cn.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import { mergeRefs } from '../../primitives/merge-refs.js';
import { useAnchored } from '../../primitives/use-anchored.js';
import { useTooltipDisclosure } from './tooltip.disclosure.js';
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
  // STATE, not a ref: both the listeners below and the measurement have to run
  // again when the trigger node changes, and a ref would never tell them it had.
  const [triggerNode, setTriggerNode] = useState<HTMLElement | null>(null);

  // When it is shown and when it goes, named — the timing and the click/focus
  // race are in there, so the listeners below say what the user did and nothing
  // about how it is implemented. Destructured because each action is stable and
  // the object is not.
  const {
    open,
    engaged,
    showNow,
    showAfterDelay,
    showOnFocus,
    hideAfterDelay,
    dismiss,
    dismissOnPress,
  } = useTooltipDisclosure({ openDelay, closeDelay });

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

  // The trigger's listeners are NATIVE, added to the node itself, and that is
  // the whole composition story: `cloneElement` props REPLACE the child's, so a
  // trigger with its own `onFocus` would have silently lost it — the same defect
  // the form ports had with a plain spread, in different clothes. Composing by
  // hand is possible but easy to forget one; `addEventListener` is additive by
  // construction, so the trigger's handlers were never in our way to begin with.
  useEffect(() => {
    if (!triggerNode) return;

    const onPointerEnter = () => showAfterDelay();
    const onPointerDown = () => dismissOnPress();

    const onPointerLeave = () => {
      // Focus outlives the pointer. Measured: tabbing to a trigger and then
      // brushing the mouse over it dismissed what the keyboard had opened,
      // which is the "persistent" half of WCAG 1.4.13 broken.
      if (triggerNode.matches(':focus-visible')) return;
      hideAfterDelay();
    };
    const onBlur = () => {
      // …and the pointer outlives the focus, for the same reason.
      if (triggerNode.matches(':hover')) return;
      hideAfterDelay();
    };
    const onFocus = (event: FocusEvent) => {
      if ((event.target as HTMLElement).matches(':focus-visible'))
        showOnFocus();
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
  }, [
    triggerNode,
    showAfterDelay,
    showOnFocus,
    hideAfterDelay,
    dismissOnPress,
  ]);

  // The SURFACE's listeners are native for a reason of its own, and this one was
  // measured: React's synthetic `pointerenter` never fired when the pointer
  // travelled from the trigger onto the surface with a real mouse — only under
  // `user-event`, which dispatches the event straight at the element. The test
  // suite said hoverable; a real pointer said the tooltip vanished under it.
  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;

    const stay = () => showNow();
    const leave = () => hideAfterDelay();

    surface.addEventListener('pointerenter', stay);
    surface.addEventListener('pointerleave', leave);
    return () => {
      surface.removeEventListener('pointerenter', stay);
      surface.removeEventListener('pointerleave', leave);
    };
  }, [showNow, hideAfterDelay]);

  // Escape must dismiss without moving focus, from wherever the user is — hence
  // the document and not the trigger: with a tooltip open the focus may sit
  // anywhere, and a handler on the trigger would never hear it.
  useEffect(() => {
    // `engaged`, not `open`: an open that has been asked for is a thing to
    // dismiss. Nothing wider — merely hovering a trigger would otherwise eat
    // the user's Escape.
    if (!engaged) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // The Escape is SPENT here. Measured: without this, dismissing a tooltip
      // inside a modal `<dialog>` closed the dialog as well — one keypress,
      // two dismissals, and the user loses the thing they were working in.
      event.preventDefault();
      event.stopPropagation();
      dismiss();
    };

    // Capture, so no handler between the document and the trigger acts on an
    // Escape that was ours to answer.
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [engaged, dismiss]);

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

  // `content` that only repeats the name is announced twice, and only
  // `aria-label` can say so exactly — anything else means computing an
  // accessible name by hand, which was tried here and got `<img alt>` wrong.
  // An unnamed trigger is `axe`'s `button-name`, where it is computed properly.
  useDevWarning(
    triggerNode?.getAttribute('aria-label')?.trim() === content.trim(),
    `Tooltip: \`content\` repeats the trigger's accessible name, so a screen ` +
      'reader announces it twice. Either describe something the name does not ' +
      'say, or drop the tooltip.',
  );

  // `children.props.ref`, not `children.ref`: in React 19 the ref IS a regular
  // prop, and reading the old field warns on every render.
  const childProps = children.props as Record<string, unknown> & {
    'aria-describedby'?: string;
    ref?: Ref<HTMLElement>;
  };
  const childRef = childProps.ref;
  const theirDescribedBy = childProps['aria-describedby'];

  // …and the description must not depend on it either. The prop above is what
  // makes the description exist before hydration, so it stays; this puts it back
  // when the trigger dropped it. Measured: a component that forwards its ref and
  // picks the props it recognises keeps the ref and silently loses this.
  useEffect(() => {
    if (!triggerNode) return;

    const tokens = (triggerNode.getAttribute('aria-describedby') ?? '')
      .split(' ')
      .filter(Boolean);
    if (tokens.includes(id)) return;

    triggerNode.setAttribute('aria-describedby', [...tokens, id].join(' '));
    return () => {
      const rest = (triggerNode.getAttribute('aria-describedby') ?? '')
        .split(' ')
        .filter((token) => token && token !== id);
      if (rest.length) {
        triggerNode.setAttribute('aria-describedby', rest.join(' '));
      } else {
        triggerNode.removeAttribute('aria-describedby');
      }
    };
  }, [triggerNode, id, theirDescribedBy]);

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
    'aria-describedby': cn(theirDescribedBy, id),
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

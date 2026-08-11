import { isValidElement, useEffect, useId, useRef, useState } from 'react';
import { cn } from '../../util/cn.js';
import { useDevWarning } from '../../primitives/use-dev-warning.js';
import {
  useTooltipTriggerWarning,
  useTooltipUnfocusableWarning,
} from './tooltip.guards.js';
import { Slot } from '../../primitives/slot.js';
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

  // STRICTER than the slot it renders through, on purpose. `Slot` warns and
  // renders the children untouched, which is right for a class name or a
  // marking — losing those degrades the look. Losing the TRIGGER leaves a
  // tooltip that can never be opened by anything, and a surface sitting in the
  // DOM waiting for an anchor that will not come: the component has no job
  // left, so it says so instead of pretending.
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
    releasePress,
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

  useAnchored(triggerNode, surfaceRef, {
    placement,
    open,
    // A trigger that goes away takes its tooltip with it. Measured: removing a
    // hovered trigger left the tooltip painted on screen forever, because the
    // `pointerleave` that would have closed it could never fire.
    onAnchorLost: dismiss,
  });

  // The trigger's listeners are NATIVE, added to the node itself. `Slot` now
  // composes handlers rather than replacing them, so the original reason for
  // this — a hand-written `cloneElement` that would have silently dropped a
  // trigger's own `onFocus` — is gone. It stays for the stronger one it always
  // also had: a handler passed as a PROP depends on the child forwarding props
  // it does not recognise, and a component that keeps only the ones it knows
  // loses it with nothing to report. A listener on the node cannot be dropped
  // by anybody, and `addEventListener` is additive by construction.
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
      // The press is released whatever happens — it only ever meant "the focus
      // that follows THIS click is not a reason to open". Measured: keeping it
      // latched while the pointer rested on the trigger meant a user who
      // clicked and left the mouse there got no tooltip from the keyboard
      // again, which is the persistent half of WCAG 1.4.13 lost to a flag.
      releasePress();
      // …and the pointer outlives the focus, as the focus outlives the pointer.
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
    releasePress,
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

      // SPENT only if there is something to see. Measured: gated on `engaged`
      // alone, a pointer merely resting on a trigger swallowed the Escape from
      // millisecond 0 of a 400ms delay — inside a `<dialog>`, one keypress
      // dismissed nothing at all. An open that has only been ASKED for is
      // cancelled here and the key travels on to whoever else wants it.
      if (open) {
        event.preventDefault();
        event.stopPropagation();
      }
      dismiss();
    };

    // Capture, so no handler between the document and the trigger acts on an
    // Escape that was ours to answer.
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [engaged, open, dismiss]);

  useTooltipTriggerWarning(triggerNode);
  useTooltipUnfocusableWarning(triggerNode);

  // `content` that only repeats the name is announced twice, and only
  // `aria-label` can say so exactly — anything else means computing an
  // accessible name by hand, which was tried here and got `<img alt>` wrong.
  // An unnamed trigger is `axe`'s `button-name`, where it is computed properly.
  useDevWarning(
    // `typeof` FIRST, because this predicate runs on every render in prod too:
    // `content` is typed string, but a JavaScript consumer building props from
    // a mapped or spread source gets no excess-property check — the exact
    // audience Table defends for `sortLabel` — and handing a node or a number
    // here made `.trim()` a TypeError that took the page down, with an error
    // naming neither the component nor the mistake (the failure mode this
    // file records eliminating once already, for `cloneElement`). The render
    // itself would have coped.
    typeof content === 'string' &&
      triggerNode?.getAttribute('aria-label')?.trim() === content.trim(),
    `Tooltip: \`content\` repeats the trigger's accessible name, so a screen ` +
      'reader announces it twice. Either describe something the name does not ' +
      'say, or drop the tooltip.',
  );

  // Read for the effect below, and for nothing else now: the merging itself is
  // `Slot`'s, which knows `aria-describedby` is a LIST of ids rather than one.
  const childProps = children.props as { 'aria-describedby'?: string };
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

  // The state setter IS a callback ref, so the trigger needs no ref of our own.
  // `Slot` merges it with whatever ref the child already had, keeps both ids on
  // `aria-describedby` because that attribute is a list, and renders the
  // child's own element — nothing of the tooltip's appears in the DOM here.
  //
  // This used to be a hand-written `cloneElement` beside a `useMemo`, and the
  // two rules it encoded — merge the ref, concatenate the description — are the
  // two `Slot` states as truths about a ref and about an id list.
  const trigger = (
    <Slot ref={setTriggerNode} aria-describedby={id}>
      {children}
    </Slot>
  );

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

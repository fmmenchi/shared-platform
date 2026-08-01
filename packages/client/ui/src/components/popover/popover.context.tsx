import { createContext, useContext } from 'react';
import type { Placement } from '@floating-ui/dom';
import { useDevWarning } from '../../primitives/use-dev-warning.js';

/**
 * What a `Popover` provides to its parts. Note what is NOT here: nothing that
 * opens or closes it. The platform owns that — `popovertarget` toggles,
 * `popover="auto"` dismisses — so the parts have no `open()` to call and no way
 * to disagree with the browser about the state. `open` below is a MIRROR, read
 * from the `toggle` event, and it exists for the two things the platform does
 * not do for us: telling the trigger what to say in `aria-expanded`, and
 * telling the geometry when to start measuring.
 */
export interface PopoverContextValue {
  /** The surface's id: what the trigger targets, and what it controls. */
  surfaceId: string;
  /** Whether the platform has it open. Mirrored, never commanded. */
  open: boolean;
  /** Told by the content when the platform toggles it. */
  reportOpen: (open: boolean) => void;
  /** The trigger's node, which is what the surface anchors to. */
  anchor: HTMLElement | null;
  setAnchor: (node: HTMLElement | null) => void;
  /** The heading's id, when there is one — the surface's accessible name. */
  headingId: string | undefined;
  setHeadingId: (id: string | undefined) => void;
  /** The controlled value, or `undefined` when the DOM owns the state. */
  controlled: boolean | undefined;
  /** Whether the consumer wired `onOpenChange` — a controlled popover needs it. */
  hasOpenChange: boolean;
  /** The mount-time seed, read by the content — see `PopoverProps.defaultOpen`. */
  defaultOpen: boolean;
  /** Preferred side, passed to the geometry by the content. */
  placement: Placement;
}

export const PopoverContext = createContext<PopoverContextValue | null>(null);

export const usePopoverContext = (): PopoverContextValue | null =>
  useContext(PopoverContext);

/**
 * Context for a `Popover` PART, warning (with the part's own name) when it is
 * used outside one. Every part reads the context through this, so an orphan part
 * can't fail silently. It returns `null` rather than throwing: a misplaced part
 * is worth a loud warning, not a crashed page.
 */
export function usePopoverPart(part: string): PopoverContextValue | null {
  const context = usePopoverContext();
  useDevWarning(
    context == null,
    `${part}: used outside a <Popover>, so it is not wired to anything.`,
  );
  return context;
}

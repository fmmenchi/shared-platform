/**
 * The surface a command opens, or `null` when it opens none.
 *
 * Read off the ELEMENT rather than tracked, because `popovertarget` is where
 * the fact already lives: the trigger names its surface for the platform, so
 * asking the platform's own wiring cannot disagree with it. A disabled command
 * carries no target, which is why this answers `null` for one.
 */
export function surfaceOf(element: Element | null | undefined) {
  const id = element?.getAttribute('popovertarget');
  return id ? document.getElementById(id) : null;
}

/** Whether that surface is open right now. */
export function isOpen(element: Element | null | undefined) {
  return surfaceOf(element)?.matches(':popover-open') ?? false;
}

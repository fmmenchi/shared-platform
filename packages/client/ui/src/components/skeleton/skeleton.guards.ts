/**
 * The dev guard for the one mistake this component cannot fail loudly on.
 *
 * Pure functions in their own file, like `visually-hidden.guards.ts`: the
 * question is about props, so it is answerable without rendering anything, and
 * it is tested generically rather than through the component.
 */

/** `aria-hidden` is the component's own — it is the answer, not the mistake. */
const OWNED = 'aria-hidden';

/**
 * Which of a caller's props will be annulled by `aria-hidden`, in the order
 * they were passed.
 *
 * `role` and every `aria-*` reach the DOM through the spread and are then
 * removed from the accessibility tree along with the element carrying them.
 * `tabIndex` is dropped by the component for a different reason — focus on a
 * hidden element is a WCAG 4.1.2 defect — but it is the same misunderstanding
 * arriving from the other side, so it is named by the same warning.
 */
export function smuggledAria(props: object): string[] {
  return Object.keys(props).filter(
    (name) =>
      name === 'role' ||
      name === 'tabIndex' ||
      (name.startsWith('aria-') && name !== OWNED),
  );
}

/** The warning, which has to say what to do instead or it is just noise. */
export function deadAriaMessage(names: readonly string[]): string {
  return (
    `Skeleton: ${names.join(', ')} ${names.length === 1 ? 'has' : 'have'} no effect. ` +
    'A skeleton is always `aria-hidden`, so anything you put on it is removed ' +
    'from the accessibility tree with it. Announce the wait from a live region ' +
    'outside the placeholders — a persistent `VisuallyHidden` with ' +
    '`role="status"`, or `Progress` with no `value`.'
  );
}

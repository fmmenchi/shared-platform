/**
 * The one way to misuse this component, and why only the DOM can catch it.
 *
 * Hiding something FOCUSABLE is the failure: a sighted keyboard user tabs into
 * a control that is one pixel wide and nothing on screen moves, so the focus
 * ring is simply gone (WCAG 2.4.7, and 2.4.11 for the same reason). It is worth
 * a guard because nothing else in this pipeline reports it — axe walks the
 * accessibility tree, where the element is present and named exactly as
 * intended, so an axe assertion on a component doing this passes cleanly.
 *
 * It cannot be answered from props. "Does this subtree contain something
 * tabbable" has no render-time answer — the same reason `TabPanel` states for
 * defaulting its own `tabIndex` — so the question goes to the node, one task
 * after commit, via `deferDevCheck`.
 *
 * A WARNING, not a refusal: a visually-hidden `<input type="file">` behind a
 * styled `<label>` is a real pattern, and this component is not the authority
 * on whether a consumer has a reason. It names the hazard and gets out of the way.
 */

/**
 * What the browser will put in the sequential focus order.
 *
 * `:disabled` is excluded because a disabled control is not focusable, and
 * `[tabindex="-1"]` because programmatic focus is not what breaks here — it is
 * TAB reaching an invisible stop. Deliberately not exhaustive (no `[controls]`
 * media, no `contenteditable`): a guard that is wrong sends people to silence
 * it, and these are the elements this component is actually wrapped around.
 */
const FOCUSABLE = [
  'a[href]',
  'button:not(:disabled)',
  'input:not(:disabled)',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  'summary',
  'iframe',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/** The node itself, or anything under it, that Tab can reach. */
export function focusableWithin(node: HTMLElement): HTMLElement | null {
  if (node.matches(FOCUSABLE)) return node;
  return node.querySelector<HTMLElement>(FOCUSABLE);
}

/** Names what was found, so the warning points at an element and not a rule. */
export function hiddenFocusableMessage(found: HTMLElement): string {
  return (
    `VisuallyHidden: <${found.localName}> inside it can be reached with Tab, ` +
    'so the focus lands on something nobody can see. Either let the element be ' +
    'visible when it has focus (the skip-link pattern AppLayout uses), or do ' +
    'not hide it.'
  );
}

/**
 * The one way to misuse this component, and why only the DOM can catch it.
 *
 * Hiding something TABBABLE is the failure: a sighted keyboard user tabs into a
 * control that is one pixel wide and nothing on screen moves, so the focus ring
 * is simply gone (WCAG 2.4.7, and 2.4.11 for the same reason). It is worth a
 * guard because nothing else reports it — axe walks the accessibility tree,
 * where the element is present and named exactly as intended. Verified against
 * axe-core 4.12 with every tag enabled, including `target-size`: zero
 * violations and zero incomplete, and `target-size` scores the 1px control a
 * PASS.
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
 * Candidates. Deliberately WIDE — every element that can be in the tab order
 * lands here, and `isTabbable` below does the deciding. Splitting it this way
 * is the fix for a selector-only version that was wrong eleven measured ways.
 */
const FOCUSABLE_CANDIDATES = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  'summary',
  'iframe',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]',
  '[tabindex]',
].join(',');

/**
 * Whether TAB actually reaches this element — the only question that matters,
 * and one a selector cannot answer. Every clause below was measured with real
 * Tab presses in Chromium rather than reasoned about, because the first version
 * of this file reasoned about it and was wrong on all of these.
 */
function isTabbable(el: HTMLElement): boolean {
  // Present in the DOM and not rendered: `hidden`, and `type="hidden"`, which
  // is routine inside form components.
  if (el.hasAttribute('hidden')) return false;
  if (el instanceof HTMLInputElement && el.type === 'hidden') return false;

  // A disabled control is not focusable. `:disabled` rather than the `disabled`
  // PROPERTY, which is the narrower test: inside a `<fieldset disabled>` a
  // button reports `disabled === false` while matching `:disabled`, and a real
  // Tab sweep never reaches it. Measured — the property version warned there.
  if (el.matches(':disabled')) return false;

  // `inert` takes a whole subtree out of the focus order — which is what a
  // modal does to the page behind it.
  if (el.closest('[inert]') != null) return false;

  // Only the FIRST summary of a details is a control; anywhere else it is an
  // ordinary element that the `summary` selector would still have matched.
  if (el.localName === 'summary') {
    const parent = el.parentElement;
    if (parent?.localName !== 'details') return false;
    if (parent.querySelector('summary') !== el) return false;
  }

  // THE ONE KIND THE `tabIndex` PROPERTY DOES NOT REFLECT. A `contenteditable`
  // region is reachable with Tab and reports `tabIndex === -1`, so it is asked
  // separately; an explicit `tabindex` still wins, hence the attribute check.
  // Media with `controls` was here too, on a claim that did not survive
  // measurement: `<video controls>` reports 0, so the return below already
  // answers it and the branch was dead.
  if (el.isContentEditable && !el.hasAttribute('tabindex')) return true;

  // THE PROPERTY, NOT THE ATTRIBUTE, for everything else. `el.tabIndex`
  // reflects the PARSED value, which collapses four separate bugs into one
  // correct test: `-1` (this package's own roving idiom, in Tabs and Menu),
  // any other negative value (`-2` is focusable but not tabbable, exactly like
  // `-1`), and an invalid value (`"bogus"`, `""`) which makes the element not
  // focusable at all. A `:not([tabindex="-1"])` selector misses three of the
  // four — and, attached to one selector in a list, did not apply to the others.
  return el.tabIndex >= 0;
}

/** The node itself, or anything under it, that Tab can reach. */
export function tabbableWithin(node: HTMLElement): HTMLElement | null {
  // THE ROOT GOES THROUGH THE CANDIDATE FILTER TOO. Skipping it made identical
  // markup answer differently depending on its position: `<VisuallyHidden
  // as="a">` with no `href` reports `tabIndex === 0` and is never in the tab
  // order, so as a root it warned and as a descendant it did not.
  if (node.matches(FOCUSABLE_CANDIDATES) && isTabbable(node)) return node;
  const candidates = node.querySelectorAll<HTMLElement>(FOCUSABLE_CANDIDATES);
  for (const candidate of candidates) {
    if (isTabbable(candidate)) return candidate;
  }
  return null;
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

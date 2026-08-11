/**
 * Stop the page behind a modal from scrolling, and let it go again.
 *
 * INLINE, not a stylesheet rule, and that is the whole point. The first version
 * was one CSS rule — `:root:has(.dialog[open]) { overflow: hidden }` — which is
 * elegant and wrong twice over:
 *
 * - it lives in `@layer fmmenchi`, so an ordinary unlayered `html { overflow-y:
 *   auto }` on the consumer's page beats it and the modal opens over a page
 *   that still scrolls. Measured in all three engines. ADR-0022 had already
 *   rejected exactly this shape — "components would depend on something that
 *   silently stops applying in precisely the apps most likely to have opinions
 *   about CSS" — and this is the one rule where losing the cascade is a
 *   functional failure rather than a restyle;
 * - `[open]` is not `:modal`. A non-modal `<dialog open>` froze a page that
 *   stayed fully clickable and keyboard-reachable, with no backdrop and nothing
 *   to dismiss. Measured, all three engines.
 *
 * An inline style beats every stylesheet, layered or not, and the lock is asked
 * for by the component only when the dialog is genuinely modal — so both
 * defects are answered by moving the decision from the cascade to the code.
 *
 * It also compensates the scrollbar it hides. Hiding the overflow widens the
 * viewport by the scrollbar's width and the page's content jumps sideways:
 * measured at 15px in WebKit with a classic scrollbar. `scrollbar-gutter:
 * stable` does NOT cure it there — measured, though the engine reports the
 * property as supported. Padding the root does, for content in the flow;
 * elements positioned `fixed` still move, and nothing an author can write from
 * here changes that (`react-remove-scroll` has the same limitation, for the
 * same reason).
 *
 * Counted, because dialogs nest: only the first lock writes, only the last
 * release clears.
 */
const DEPTH = 'fmScrollLock';

/** Which side the first lock padded, so the last unlock clears the same one. */
let paddedSide: 'padding-left' | 'padding-right' | null = null;
/** The consumer's own INLINE value on that side, put back on unlock. */
let previousInline: { value: string; priority: string } | null = null;

/** Lock the page. Safe to call from anywhere; the count keeps nesting honest. */
export function lockScroll(): void {
  const root = document.documentElement;
  const depth = Number(root.dataset[DEPTH] ?? 0);

  if (depth === 0) {
    // Read BEFORE hiding the overflow — afterwards the gutter is already gone
    // and the difference measures zero.
    const gutter = window.innerWidth - root.clientWidth;
    // THE SCROLLBAR'S SIDE, from the computed direction. On an rtl page
    // Chromium and Firefox draw the classic vertical scrollbar on the LEFT,
    // so padding the right both leaves the jump and adds a spurious gutter on
    // the reading side. The original only ever measured ltr. (WebKit's rtl
    // placement is asserted by nothing here — the padding follows the
    // direction, which matches the two engines it was measured in.)
    const side =
      getComputedStyle(root).direction === 'rtl'
        ? 'padding-left'
        : 'padding-right';
    // SUMMED with the page's own padding, not written over it. The computed
    // value is read before anything changes: `html { padding-right: 2rem }`
    // overwritten with the bare gutter jumped the content LEFT by 2rem — the
    // exact movement this function exists to prevent — and snapped back on
    // close.
    const computed =
      Number.parseFloat(getComputedStyle(root).getPropertyValue(side)) || 0;
    // `important`, and only here. A plain inline style beats an ordinary page
    // rule but loses to `html { overflow-y: auto !important }` — measured — and
    // a modal that lets the page scroll behind it is a functional failure, not
    // a difference of taste. It is written for the life of the dialog and taken
    // off again, so it wins an argument it cannot leave behind.
    root.style.setProperty('overflow', 'hidden', 'important');
    if (gutter > 0) {
      // A consumer's own inline padding is SAVED, not clobbered: removeProperty
      // on unlock would delete a value this code did not write.
      previousInline = {
        value: root.style.getPropertyValue(side),
        priority: root.style.getPropertyPriority(side),
      };
      paddedSide = side;
      root.style.setProperty(side, `${computed + gutter}px`, 'important');
    }
  }

  root.dataset[DEPTH] = String(depth + 1);
}

/** Let it go — when the last modal that asked for it has closed. */
export function unlockScroll(): void {
  const root = document.documentElement;
  const depth = Number(root.dataset[DEPTH] ?? 0) - 1;

  if (depth > 0) {
    root.dataset[DEPTH] = String(depth);
    return;
  }

  delete root.dataset[DEPTH];
  root.style.removeProperty('overflow');
  if (paddedSide !== null) {
    if (previousInline !== null && previousInline.value !== '') {
      root.style.setProperty(
        paddedSide,
        previousInline.value,
        previousInline.priority,
      );
    } else {
      root.style.removeProperty(paddedSide);
    }
    paddedSide = null;
    previousInline = null;
  }
}

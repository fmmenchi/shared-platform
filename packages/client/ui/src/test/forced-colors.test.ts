import { describe, it, expect } from 'vitest';

/**
 * WINDOWS HIGH CONTRAST, machine-enforced — the doctrine turned into a check,
 * because a stylesheet that forgets it looks perfect everywhere the author
 * ever runs it.
 *
 * The rule is not "every component ships a block": most of them paint no
 * colour at all, and a text colour loses nothing in forced colors — being
 * replaced by the system's is the entire point. What is actually TAKEN AWAY is
 * three things:
 *
 *   - a `box-shadow`, removed outright, which a surface floating over the page
 *     may have been using as its only edge;
 *   - a focus `outline-color`, forced to the same system colour as everything
 *     around it, so a ring reads as no ring;
 *   - a background FILL that carried meaning — an error tint, a selected row —
 *     which collapses to `Canvas`.
 *
 * So: a stylesheet that does any of those must either ship a block or say why
 * it does not. Two already say why, one of them measured, and this is what
 * keeps that from being the exception nobody repeats.
 */
const stylesheets = import.meta.glob('../components/**/*.module.css', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/**
 * What forced colors removes, and therefore what has to be answered for.
 *
 * The `background: var(--fm-color-…)` arm was added after the check MISSED its
 * own example. The comment above names "a selected row" as the meaningful fill
 * to answer for, and the row that arrived paints it as a plain declaration
 * rather than a Tailwind class — so the one case the doctrine spells out was
 * the one the pattern could not see. Adding it failed nothing that already
 * shipped: all four stylesheets it newly matches were answering already.
 *
 * Then it missed the same shape AGAIN, one indirection later: `Slider` routes
 * its token through a component property (`background-color:
 * var(--slider-progress)`, itself set from `--fm-color-*`), which the
 * token-prefixed pattern could not see either. The arm now matches any
 * `var(--…)` background — a custom property that ISN'T carrying colour still
 * deserves the question, because forced colors will flatten whatever it
 * carries into the fill.
 */
const LOSES =
  /shadow-(?!none)|outline-ring|outline-color|\bbg-(?!none)[a-z]|background(-color)?:\s*var\(--/;

describe('forced colors', () => {
  it('has stylesheets to check at all', () => {
    // The glob is not pinned to a depth; if the tree moves, this fails loudly
    // rather than passing over an empty set.
    expect(Object.keys(stylesheets).length).toBeGreaterThan(20);
  });

  for (const [path, raw] of Object.entries(stylesheets)) {
    const name = path.split('/').pop();
    const loses = LOSES.exec(raw);
    if (!loses) continue;

    it(`${name} answers for what forced colors takes away`, () => {
      // Either a block, or a comment recording why none is needed — both
      // mention it, and both are a decision rather than an oversight.
      expect(
        raw.includes('forced-colors'),
        `${name} paints ${loses[0]}…, which forced colors removes or flattens, ` +
          'and neither ships a `@media (forced-colors: active)` block nor ' +
          'records why it needs none.',
      ).toBe(true);
    });
  }
});

import type { Ramp } from '@fmmenchi/theme';

/**
 * THE RAMP — how far each rung sits from white, and how much of the base's chroma it
 * keeps. Nine rungs, and every number in it was chosen by measurement.
 *
 * IT IS THE SAME RAMP `vars.css` USES, and that is new. It began as the shipped
 * offsets resolved at one base's lightness — an anchor picked by hand, which put five
 * of the seven families somewhere else — so the wizard fed the reference bases did
 * NOT reproduce the shipped stylesheet, and the claim "ours is an invocation of the
 * same code path as a consumer's" was a direction rather than a fact. Both sides now
 * state the same nine lightnesses and the same nine chroma factors, and
 * `ramp.spec.ts` asserts the result: every rung this produces from the reference
 * bases equals the rung `vars.css` resolves to. The claim is a fact.
 *
 * IT STAYS IN THE APP rather than moving to `@fmmenchi/theme`, which was tried and
 * reverted. Two reasons, both that package's own rules: these are eighteen numbers a
 * designer chose, and theme holds no values of any kind ("THE VALUES ARE NOT HERE");
 * and the generator — the other caller that would justify the move — does not build
 * palettes, it takes a theme file with `--from` and injects declarations.
 *
 * ABSOLUTE LIGHTNESS, NOT AN OFFSET (ADR-0033). Measured across 648 bases, an
 * offset-anchored ramp's contrast distance MOVES with the base while an absolute one
 * does not, and a guarantee that shifts under you is not one. `vars.css` still writes
 * offsets because a rung there must stay derived from its base — overriding one
 * number is what makes a rebrand seven numbers rather than sixty-three — but its
 * offsets are now computed PER FAMILY so that every family lands on the absolute
 * lightnesses below.
 *
 * EVENLY SPACED AT 0.08. The previous curve ran 0.10 0.10 0.10 then 0.05 0.05 then
 * 0.09 0.10 0.09, so rungs 400, 500 and 600 sat half a step apart and rendered as
 * the same colour three times — nine rungs where six were distinguishable.
 *
 * THE DARK END IS 0.26, AND IT IS AS LIGHT AS THE CONTRACT ALLOWS. In OKLCH
 * lightness, off their published hexes:
 *
 *     step   ours   Material   Tailwind
 *      100   0.90     0.88       0.93
 *      500   0.58     0.66       0.62
 *      900   0.26     0.42       0.38     (Tailwind's 950 is 0.28)
 *
 * Generated for 144 brands — 24 hues × 3 chroma levels × 2 lightnesses, every family
 * given the same base, which is harsher than any real brand — and put through the
 * real contract:
 *
 *     dark end 0.34   120 of 144 brands FAIL
 *     dark end 0.30    60 of 144 brands FAIL
 *     dark end 0.26     0 fail
 *     dark end 0.22     0 fail   (the value before this)
 *
 * There is a cliff between 0.30 and 0.26, and the pair that gives way first is always
 * `input × input-invalid`, the tightest floor in the contract at 3:1. So the darkness
 * is not a preference: it is what buys ADR-0033's promise that a pair clearing its
 * floor for one brand clears it for every brand. Material and Tailwind sit lighter
 * because they hand-tune each palette and promise nothing about a brand they have not
 * seen.
 *
 * THE CHROMA FACTORS ARE THE GAMUT CEILING, rounded down with a hundredth to spare.
 * Solved with `clampChroma` at each lightness over the tightest of the seven hues:
 * ×0.285 at 0.90 (negative), ×0.554 at 0.82, ×0.869 at 0.74, unbounded through the
 * middle, ×0.884 at 0.42 (warning), ×0.716 at 0.34, ×0.547 at 0.26.
 *
 * Here that is load-bearing rather than tidy, and it cost a wrong turn to learn: my
 * first attempt rounded 0.285 UP to 0.30, and `negative-100` came out
 * `oklch(90% 0.0547 27)` — outside sRGB. `generatePalette` clamps, so the wizard
 * would have survived it; `vars.css` uses CSS relative colour, where the clamp is the
 * BROWSER's and differs per engine, so the shipped colour would have depended on who
 * was rendering it while the validator measured something else.
 *
 * WHAT THIS IS NOT: the neutral ramp. The greys are stated rather than derived
 * (ADR-0032) — no single base spans 1.00 to 0.05 and still resolves the pale end — so
 * `PALETTE_FAMILIES` is the seven chromatic families and this ramp is for them.
 */
export const WIZARD_RAMP: Ramp = [
  { step: 100, lightness: 0.9, chromaFactor: 0.27 },
  { step: 200, lightness: 0.82, chromaFactor: 0.54 },
  { step: 300, lightness: 0.74, chromaFactor: 0.85 },
  { step: 400, lightness: 0.66, chromaFactor: 1 },
  { step: 500, lightness: 0.58, chromaFactor: 1 },
  { step: 600, lightness: 0.5, chromaFactor: 1 },
  { step: 700, lightness: 0.42, chromaFactor: 0.87 },
  { step: 800, lightness: 0.34, chromaFactor: 0.7 },
  { step: 900, lightness: 0.26, chromaFactor: 0.53 },
];

/** The steps, for a caller that wants to label a row of swatches. */
export const RAMP_STEPS: readonly number[] = WIZARD_RAMP.map((r) => r.step);

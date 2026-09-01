import type { Ramp } from '@fmmenchi/theme';

/**
 * THE RAMP, AND WHY THE APP OWNS IT.
 *
 * `generatePalette` takes a base and a ramp and places one under the other. The
 * base is the brand's; the ramp is a POLICY — how far each rung sits from white,
 * how much of the base's chroma it keeps — and policy belongs to whatever decides
 * it. Right now that is this wizard.
 *
 * AND IT STAYS IN THE APP rather than moving to `@fmmenchi/theme`, which was tried
 * and reverted the same hour. Two reasons, both of them the package's own written
 * rules: these are eighteen numbers a designer chose, and theme holds no values of
 * any kind ("THE VALUES ARE NOT HERE"); and the generator — the other caller that
 * would have justified the move — does not build palettes at all, it takes a theme
 * file with `--from` and injects declarations. A ramp there would have had no caller
 * in that package's audience, which is the failure its AGENTS.md already names: *a
 * model with no caller is a guess, and a guess belongs in the place that will call
 * it*.
 *
 * `vars.css` writes the same ramp as offsets from the base (`calc(l + 0.35)`,
 * `calc(c * 0.22)`), while a `Rung` states lightness ABSOLUTELY — that is ADR-0033's
 * choice: measured across 648 bases, an offset-anchored ramp's guaranteeing contrast
 * distance moves with the base while an absolute one does not, and a guarantee that
 * shifts under you is not one.
 *
 * SO THIS RAMP DOES NOT REPRODUCE `vars.css`, and it no longer tries to. It began
 * as those offsets resolved at one base's lightness — an anchor picked by hand,
 * which put five of the seven families somewhere else anyway — and it is now stated
 * on its own terms: evenly spaced, dark end chosen by measurement (below).
 *
 * The honest consequence is unchanged and worth keeping in view: "ours is an
 * invocation of the same code path as a consumer's" is the DIRECTION, not yet the
 * fact. It becomes the fact when `vars.css` is emitted FROM a ramp instead of
 * writing its own offsets — and then this file is the input to that, rather than a
 * restatement beside it.
 *
 * WHAT THIS IS NOT: the neutral ramp. The greys are stated rather than derived
 * (ADR-0032) — no single base can span 1.00 to 0.05 and still resolve the pale end
 * — so `PALETTE_FAMILIES` is the seven chromatic families and this ramp is for
 * them.
 */
/**
 * EVENLY SPACED, AND THE DARK END IS AS LIGHT AS THE CONTRACT ALLOWS.
 *
 * The previous numbers had a PLATEAU — gaps of 0.10 0.10 0.10 then 0.05 0.05 then
 * 0.09 0.10 0.09 — so rungs 400, 500 and 600 sat half a step apart while every
 * other pair sat a full one. On screen that is three nearly identical swatches in
 * the middle of a nine-rung row, which is what made the palette look wrong before
 * anybody measured it. Every gap is 0.080 now.
 *
 * AND THE DARK END WAS 0.22, which is darker than any system this imitates. In
 * OKLCH lightness, measured off their published hexes:
 *
 *     step   ours   Material   Tailwind
 *      100   0.90     0.88       0.93
 *      500   0.58     0.66       0.62
 *      900   0.26     0.42       0.38     (Tailwind's 950 is 0.28)
 *
 * It also halved the chroma there (×0.5, against Material's 0.157 and Tailwind's
 * 0.138 at the 900), so the bottom of every ramp read as near-black mud. Now ×0.75.
 *
 * 0.26 RATHER THAN MATERIAL'S 0.42, and this is the part worth keeping: the
 * darkness buys the guarantee. Generated for 144 brands — 24 hues × 3 chroma levels
 * × 2 lightnesses, every family given the same base, which is the harshest case —
 * and validated against the real contract:
 *
 *     dark end 0.34   120 of 144 brands FAIL
 *     dark end 0.30    60 of 144 brands FAIL
 *     dark end 0.26     0 fail
 *     dark end 0.22     0 fail   (the old value)
 *
 * There is a cliff between 0.30 and 0.26, and the pair that always gives way first
 * is `input × input-invalid`, the tightest floor in the contract at 3:1. So 0.26 is
 * not a taste: it is the lightest dark end that keeps ADR-0033's promise that a pair
 * clearing its floor for one brand clears it for every brand. Material and Tailwind
 * can sit at 0.38–0.42 because they hand-tune each palette and promise nothing about
 * a brand they have not seen.
 *
 * The role that matters most barely moved: `--fm-color-primary` points at rung 700,
 * which was L 0.410 and is now 0.420.
 */
export const WIZARD_RAMP: Ramp = [
  { step: 100, lightness: 0.9, chromaFactor: 0.22 },
  { step: 200, lightness: 0.82, chromaFactor: 0.5 },
  { step: 300, lightness: 0.74, chromaFactor: 0.8 },
  { step: 400, lightness: 0.66, chromaFactor: 0.95 },
  { step: 500, lightness: 0.58, chromaFactor: 1 },
  { step: 600, lightness: 0.5, chromaFactor: 1 },
  { step: 700, lightness: 0.42, chromaFactor: 0.99 },
  { step: 800, lightness: 0.34, chromaFactor: 0.875 },
  { step: 900, lightness: 0.26, chromaFactor: 0.75 },
];

/** The steps, for a caller that wants to label a row of swatches. */
export const RAMP_STEPS: readonly number[] = WIZARD_RAMP.map((r) => r.step);

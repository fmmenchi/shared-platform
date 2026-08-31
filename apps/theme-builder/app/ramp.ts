import type { Ramp } from '@fmmenchi/theme';

/**
 * THE RAMP, AND WHY THE APP OWNS IT.
 *
 * `generatePalette` takes a base and a ramp and places one under the other. The
 * base is the brand's; the ramp is a POLICY — how far each rung sits from white,
 * how much of the base's chroma it keeps — and policy belongs to whatever decides
 * it. Right now that is this wizard.
 *
 * These nine rungs are the shipped ramp, restated. `vars.css` writes it as offsets
 * from the base (`calc(l + 0.35)`, `calc(c * 0.22)`), while a `Rung` states
 * lightness ABSOLUTELY — that is ADR-0033's choice, and it is the reason the two
 * spellings differ: measured across 648 bases, an offset-anchored ramp's
 * guaranteeing contrast distance moves with the base while an absolute one does
 * not, and a guarantee that shifts under you is not one.
 *
 * So the numbers below are the shipped offsets resolved at the reference base's
 * 55% lightness. A brand whose primary is lighter or darker gets rungs at these
 * lightnesses rather than at these distances, which is the whole point.
 *
 * WHAT THIS IS NOT: the neutral ramp. The greys are stated rather than derived
 * (ADR-0032) — no single base can span 1.00 to 0.05 and still resolve the pale end
 * — so `PALETTE_FAMILIES` is the seven chromatic families and this ramp is for
 * them.
 */
export const WIZARD_RAMP: Ramp = [
  { step: 100, lightness: 0.9, chromaFactor: 0.22 },
  { step: 200, lightness: 0.8, chromaFactor: 0.55 },
  { step: 300, lightness: 0.7, chromaFactor: 0.95 },
  { step: 400, lightness: 0.6, chromaFactor: 1 },
  { step: 500, lightness: 0.55, chromaFactor: 1 },
  { step: 600, lightness: 0.5, chromaFactor: 1 },
  { step: 700, lightness: 0.41, chromaFactor: 0.96 },
  { step: 800, lightness: 0.31, chromaFactor: 0.72 },
  { step: 900, lightness: 0.22, chromaFactor: 0.5 },
];

/** The steps, for a caller that wants to label a row of swatches. */
export const RAMP_STEPS: readonly number[] = WIZARD_RAMP.map((r) => r.step);

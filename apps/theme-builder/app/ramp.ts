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
 * SO THE TWO SPELLINGS DO NOT AGREE, and it is worth knowing by how much rather
 * than assuming they do. All seven chromatic families share one ramp SHAPE in
 * `vars.css`, but their bases sit at 0.54–0.60, so resolving those offsets needs an
 * anchor chosen by hand. Anchored at 0.55, measured per family:
 *
 *     primary    0.55   ΔL 0.000   <- the anchor
 *     success    0.55   ΔL 0.000
 *     accent     0.54   ΔL 0.010
 *     info       0.56   ΔL 0.010
 *     secondary  0.57   ΔL 0.020
 *     negative   0.57   ΔL 0.020
 *     warning    0.60   ΔL 0.050   <- worst, at step 300
 *
 * The honest consequence: this wizard, fed the reference bases, does NOT reproduce
 * the shipped stylesheet. Five families land within ΔL 0.02 and `warning` within
 * 0.05. So "ours is an invocation of the same code path as a consumer's" is the
 * DIRECTION and not yet the fact — it becomes the fact when `vars.css` is emitted
 * from a ramp instead of writing its own offsets, and then this comment goes away.
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

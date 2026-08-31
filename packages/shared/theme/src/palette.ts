/**
 * GENERATING A PALETTE — seven colours become the rungs of every family.
 *
 * Level 1 to level 2 of the token architecture (ADR-0032): a brand hands over one
 * colour per family, and this places the whole ramp under each of them. What comes
 * out is not a theme — no role is assigned yet — which is why it is its own step:
 * how a rung comes to exist is a question about curves, chroma and the edge of
 * sRGB, while which rung a role points at is a question about contrast. Two
 * decisions that fail differently, so two functions (ADR-0033).
 *
 * A base contributes its HUE and its CHROMA. It does not contribute its lightness:
 * every rung states its own, absolutely. Measured across 648 bases, an
 * offset-anchored ramp's guaranteeing contrast distance moves with the base — 6
 * rungs or 7 depending — while an absolutely anchored one does not, and a
 * guarantee that shifts under you is not one.
 */
import { converter, displayable, formatCss, parse as parseColor } from 'culori';

import { resolveCssVar } from './utils/parse-css.js';
import { PALETTE_FAMILIES } from './tokens.types.js';
import type { PaletteFamily } from './tokens.types.js';

const toOklch = converter('oklch');

/**
 * One rung of a ramp: where it sits, and how much of the base's chroma it keeps.
 *
 * `lightness` is absolute, 0–1. `chromaFactor` is a proportion, so a family with
 * a muted base gets a muted ramp and one with a vivid base gets a vivid one — the
 * shape is shared, the intensity is the brand's.
 */
export interface Rung {
  /** Its name in the token surface: `700` in `--fm-palette-primary-700`. */
  readonly step: number;
  readonly lightness: number;
  /** 0–1. Zero makes the rung achromatic whatever the base. */
  readonly chromaFactor: number;
}

/** A ramp, ordered lightest to darkest. Every family is placed on the same one. */
export type Ramp = readonly Rung[];

/** One colour per family: what a brand actually hands over. */
export type Bases = Readonly<Record<PaletteFamily, string>>;

/**
 * Every family's rungs, resolved.
 *
 * Keyed for lookup rather than listed, because reading one is the common use:
 * `palette.primary[700]` is how a caller points a role at a rung.
 */
export type Palette = Readonly<
  Record<PaletteFamily, Readonly<Record<number, string>>>
>;

/**
 * The largest chroma at this lightness and hue that sRGB can actually show.
 *
 * CLAMPED, NOT PASSED THROUGH, and the package's rules require it: an out-of-gamut
 * oklch renders differently in every browser, each mapping it back its own way, so
 * two people measuring the same theme get different answers and the contrast gate
 * measures a colour nobody sees. Lightness is held and chroma gives way, because a
 * rung that moved in lightness would leave the ramp it belongs to.
 *
 * A bisection rather than a step-down: the gamut boundary is monotonic in chroma
 * at a fixed lightness and hue, so halving converges in a dozen rounds instead of
 * hundreds, and the result is stable rather than dependent on a step size.
 */
function fitChroma(lightness: number, chroma: number, hue: number): number {
  const fits = (c: number) =>
    displayable({ mode: 'oklch', l: lightness, c, h: hue });

  if (fits(chroma)) return chroma;

  let low = 0;
  let high = chroma;
  for (let i = 0; i < 24; i++) {
    const mid = (low + high) / 2;
    if (fits(mid)) low = mid;
    else high = mid;
  }
  return low;
}

/**
 * ROUNDED, AND NOT FOR TIDINESS.
 *
 * Full-precision output is not stable across JavaScript engines. `fitChroma`'s
 * bisection runs through culori's gamut conversions, which call `cbrt` and `pow` —
 * and those are not required to be bit-exact between implementations. Measured:
 * the same bases produced `oklch(0.9 0.015695460309523714 194.00079384283254)` in
 * Chromium and `…523703 194.0007938428326` in Node, which React reported as a
 * hydration mismatch the first time a page rendered a palette on the server.
 *
 * That is the small symptom. The real one is that a generated stylesheet would not
 * be reproducible: emit it on one machine, validate it on another, and the values
 * differ — for no visible reason, since these digits are far below anything an eye
 * or a contrast ratio can tell apart.
 *
 * Four decimals on lightness and chroma, two on hue. A JND in oklch lightness is
 * around 0.01, so four decimals is two orders of magnitude finer than perception,
 * and the emitted CSS becomes readable as a bonus rather than as the point.
 */
function round(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

/**
 * CHROMA IS TRUNCATED, NOT ROUNDED, and a test caught the difference.
 *
 * `fitChroma` returns the largest chroma sRGB can show, so it lands ON the gamut
 * boundary — and rounding a boundary value to the nearest four decimals moves it
 * OUT half the time. The clamp then means nothing: the emitted colour is one a
 * browser has to map back its own way, which is the whole failure the clamp exists
 * to prevent. `@fmmenchi/tokens`' own rules warn about exactly this ("rounding can
 * push a boundary value back out"), and the first version of this rounding did it
 * anyway. Flooring can only move a value further inside.
 */
function floorTo(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.floor(value * factor) / factor;
}

/**
 * Place every family on the ramp.
 *
 * Throws on a base that is not a colour, rather than emitting a family of
 * `NaN`: a palette that looks generated and paints nothing is the failure a
 * caller cannot see.
 */
export function generatePalette(bases: Bases, ramp: Ramp): Palette {
  const palette: Record<string, Record<number, string>> = {};

  for (const family of PALETTE_FAMILIES) {
    const declared = bases[family];
    const parsed = parseColor(declared);
    if (!parsed) {
      throw new Error(
        `The base for "${family}" is not a colour: ${JSON.stringify(declared)}.`,
      );
    }

    const { c, h } = toOklch(parsed);
    // A grey has no hue, and none is needed: its rungs are achromatic anyway.
    const hue = h === undefined || Number.isNaN(h) ? 0 : h;

    const rungs: Record<number, string> = {};
    for (const rung of ramp) {
      const wanted = c * rung.chromaFactor;
      rungs[rung.step] = formatCss({
        mode: 'oklch',
        l: round(rung.lightness, 4),
        c: floorTo(fitChroma(rung.lightness, wanted, hue), 4),
        h: round(hue, 2),
      });
    }
    palette[family] = rungs;
  }

  return palette as Palette;
}

/**
 * The rungs a stylesheet DECLARES, as a palette.
 *
 * The other way to get one, and the reason it exists is `neutral`. The greys are
 * stated rather than derived (ADR-0032) — no single base can span 1.00 to 0.05 and
 * still resolve the pale end — so `PALETTE_FAMILIES` is the seven CHROMATIC
 * families and `generatePalette` cannot produce the eighth. Yet 34 of the 84 roles
 * point at it: every surface, every input, the greys.
 *
 * So a complete palette is two halves, and a caller says so:
 *
 *     { ...toPalette(declared), ...generatePalette(bases, ramp) }
 *
 * the stated greys underneath, the brand's seven over the top. A brand hands over
 * seven colours; the neutral scale is the design system's, and reading it is how it
 * stays that way rather than being regenerated from a base nobody chose.
 *
 * Every rung is RESOLVED, because a declaration may reference a base and a ramp is
 * relative colour — `resolveCssVar` follows both. Families outside the contract are
 * skipped: a stylesheet may declare whatever it likes, and inventing a family from
 * a name is how a typo becomes a palette.
 */
export function toPalette(
  declared: ReadonlyMap<string, string>,
): Readonly<Record<string, Readonly<Record<number, string>>>> {
  const palette: Record<string, Record<number, string>> = {};

  for (const [name, raw] of declared) {
    const match = /^--fm-palette-([a-z]+)-(\d+)$/.exec(name);
    if (!match) continue;

    const family = match[1] as string;
    const rungs = (palette[family] ??= {});
    rungs[Number(match[2])] = resolveCssVar(raw, declared);
  }

  return palette;
}

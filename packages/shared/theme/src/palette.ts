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
 * `lightness` is absolute, 0–1. The chroma is stated one of two ways: `chromaFactor`
 * is a proportion, so a family with a muted base gets a muted ramp and one with a
 * vivid base gets a vivid one — the shape is shared, the intensity is the brand's.
 * `chroma` is an absolute target for the rungs near white, where a proportion stops
 * meaning that; see `AbsoluteRung`.
 */
interface RungPosition {
  /** Its name in the token surface: `700` in `--fm-palette-primary-700`. */
  readonly step: number;
  readonly lightness: number;
}

/**
 * A rung whose chroma is a PROPORTION of its base's — the ordinary case, and what
 * makes a vivid brand's ramp vivid and a muted one's muted.
 */
interface ProportionalRung extends RungPosition {
  /** 0–1. Zero makes the rung achromatic whatever the base. */
  readonly chromaFactor: number;
  readonly chroma?: never;
}

/**
 * A rung whose chroma is an ABSOLUTE target, the same for every family.
 *
 * WHY THIS EXISTS, and it is one narrow case rather than an alternative style. Near
 * white a proportion stops meaning what it means elsewhere: sRGB allows so little
 * chroma up there that a fraction of a muted base lands ON the stated grey. Measured
 * at lightness 0.95, a shared x0.135 puts `secondary` at exactly `neutral-50`'s
 * chroma — so `secondary-subtle` and `neutral-subtle` rendered as the same colour,
 * and `accent-subtle` was 1.4x the grey. An absolute target gives all seven the same
 * chroma, which is what "an equally present tint of each family" requires: spread
 * 1.00x, and 3x the grey at worst.
 *
 * STILL CAPPED BY THE BASE. A wash must never out-saturate the brand colour it comes
 * from, so the target is a ceiling and not a floor — a genuinely grey brand gets a
 * genuinely grey wash rather than an invented tint.
 */
interface AbsoluteRung extends RungPosition {
  /** The chroma every family takes here, clamped by the gamut AND by the base. */
  readonly chroma: number;
  readonly chromaFactor?: never;
}

/**
 * One step of the ramp, stated either way — and the two are mutually exclusive in the
 * type, because a rung carrying both would have a silent winner.
 */
export type Rung = ProportionalRung | AbsoluteRung;

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
 * The gamut boundary itself — the most chroma sRGB shows at this lightness and hue.
 *
 * PROBED FROM 0.5 AND NOT FROM INFINITY, which is not a detail: `fitChroma` bisects
 * between 0 and the chroma it was given, so an infinite upper bound never comes down
 * and the loop returns 0 — a silently achromatic colour. 0.5 is comfortably outside
 * sRGB at every lightness (the most chromatic thing it can show is around 0.32), so
 * it always bisects and never short-circuits.
 */
function ceilingChroma(lightness: number, hue: number): number {
  return fitChroma(lightness, 0.5, hue);
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
      // An absolute target is capped by the base as well as by the gamut: a wash must
      // not be more saturated than the colour it is a wash OF.
      const wanted =
        rung.chroma === undefined
          ? c * rung.chromaFactor
          : Math.min(rung.chroma, c);
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
 * The DARK counterpart of a set of light bases.
 *
 * WHAT PROBLEM THIS SOLVES. A dark theme is not the light one inverted: it restates
 * its bases, because at lightness 0.75 a colour needs different chroma to read as the
 * same colour it was at 0.55. So a wizard that asks a brand for seven colours has to
 * produce fourteen, and the seven it is not given have to come from somewhere.
 *
 * THE RULE IS "THE SAME SHARE OF WHAT THE GAMUT ALLOWS", and it was found by
 * measuring the design system's own bases rather than chosen. Six of the seven light
 * bases sit between 77.6% and 79.2% of the maximum chroma sRGB can show at their
 * lightness — `secondary` is the exception at 26.8%, deliberately, being a muted
 * grey-blue. That share is what "how saturated is this brand" actually means, and it
 * is the thing worth carrying across a change of lightness. An absolute chroma is
 * not: 0.14 is 78% of the ceiling at L 0.55 and only 54% of it at L 0.75, so keeping
 * the number would quietly desaturate every family.
 *
 * Measured against the seven dark bases a designer had hand-picked, this rule lands
 * within 20% on every family (mean 14.5%), where "keep the chroma" is 19%/36% and
 * "take a fixed share of the ceiling" is 37%/193%. Contrast against the dark page is
 * unchanged in practice — 7.61–8.44 against the hand-picked 7.48–8.43.
 *
 * THE HUE IS CARRIED UNTOUCHED. A brand's blue is its blue at any lightness, and the
 * one hand-picked base that moved (`warning`, +4 degrees) is not a rule, it is a
 * designer nudging one colour.
 *
 * WHAT THIS IS NOT: a claim that a derived dark base is the best possible one. It is
 * a defensible starting point that a person may then edit — which is why the wizard
 * treats it as a default rather than as a result.
 */
export function deriveDarkBases(bases: Bases, lightness = 0.75): Bases {
  const derived: Record<string, string> = {};

  for (const family of PALETTE_FAMILIES) {
    const declared = bases[family];
    const parsed = parseColor(declared);
    if (!parsed) {
      throw new Error(
        `The base for "${family}" is not a colour: ${JSON.stringify(declared)}.`,
      );
    }

    const { l, c, h } = toOklch(parsed);
    const hue = h === undefined || Number.isNaN(h) ? 0 : h;

    // The share the light base takes of its OWN ceiling, carried to the new
    // lightness. `fitChroma` is the same gamut fit the rungs use, so a base and the
    // rungs under it agree about where the boundary is.
    const own = ceilingChroma(l, hue);
    const share = own > 0 ? c / own : 0;

    derived[family] = formatCss({
      mode: 'oklch',
      l: round(lightness, 4),
      // Fitted again after scaling, because the share is a ratio and a ratio of a
      // boundary value can land a hair outside it.
      c: floorTo(
        fitChroma(lightness, share * ceilingChroma(lightness, hue), hue),
        4,
      ),
      h: round(hue, 2),
    });
  }

  return derived as Bases;
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

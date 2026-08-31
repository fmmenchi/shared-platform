/**
 * GENERATING A PALETTE — eight colours become the rungs of every family.
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

/** A ramp, ordered lightest to darkest. */
export type Ramp = readonly Rung[];

/**
 * One ramp per family, because the families do not want the same one.
 *
 * The chromatic seven ship nine rungs; `neutral` ships far more, crowded at the
 * white end — `background`, `card`, `muted`, `input` and `border` are large
 * adjacent surfaces where a ΔL of 0.015 IS the elevation signal, while a fill
 * separated from its hover by that little would read as one colour. A single
 * shared ramp can serve one of those needs or the other, never both: dense
 * enough for the surfaces, it gives every chromatic family dozens of rungs no
 * role points at; coarse enough for the fills, it cannot express the surfaces at
 * all.
 */
export type Ramps = Readonly<Record<PaletteFamily, Ramp>>;

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
 * Place every family on the ramp.
 *
 * Throws on a base that is not a colour, rather than emitting a family of
 * `NaN`: a palette that looks generated and paints nothing is the failure a
 * caller cannot see.
 */
export function generatePalette(bases: Bases, ramps: Ramps): Palette {
  const palette: Record<string, Record<number, string>> = {};

  for (const family of PALETTE_FAMILIES) {
    const declared = bases[family];
    const parsed = parseColor(declared);
    if (!parsed) {
      throw new Error(
        `The base for "${family}" is not a colour: ${JSON.stringify(declared)}.`,
      );
    }

    // An EMPTY ramp is refused rather than quietly yielding a family with no
    // rungs: every role pointing into it would resolve to nothing, and a theme
    // whose roles are undefined is the one failure `validateTheme` reports as
    // eighty violations instead of the single missing ramp that caused them.
    const ramp = ramps[family];
    if (!ramp || ramp.length === 0) {
      throw new Error(`No ramp given for "${family}".`);
    }

    const { c, h } = toOklch(parsed);
    // A grey has no hue, and none is needed: its rungs are achromatic anyway.
    const hue = h === undefined || Number.isNaN(h) ? 0 : h;

    const rungs: Record<number, string> = {};
    for (const rung of ramp) {
      const wanted = c * rung.chromaFactor;
      rungs[rung.step] = formatCss({
        mode: 'oklch',
        l: rung.lightness,
        c: fitChroma(rung.lightness, wanted, hue),
        h: hue,
      });
    }
    palette[family] = rungs;
  }

  return palette as Palette;
}

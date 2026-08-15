/**
 * CSS value → Figma value.
 *
 * Colour conversion goes through `culori`, the same library the design system's
 * own contrast tests use. That is not a convenience: it means the colour Figma
 * shows and the colour the WCAG assertions were computed against come out of
 * one implementation, so a disagreement between them is impossible by
 * construction rather than merely unlikely.
 */
import { converter, parse as parseColor } from 'culori';
import type { FigmaRgba } from './payload.types.js';

const toRgb = converter('rgb');

/** Outside [0,1] by more than float noise — i.e. genuinely out of sRGB. */
const GAMUT_EPSILON = 1e-4;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const round6 = (n: number) => Number(n.toFixed(6));

/** A conversion either produced a value or explains why it could not. */
export type Converted<T> =
  { readonly value: T; readonly clipped: boolean } | { readonly error: string };

/**
 * A CSS colour as Figma's 0–1 sRGB. Any notation `culori` reads is accepted —
 * the design system authors in `oklch()`, which sRGB cannot always represent,
 * so out-of-gamut channels are clipped AND flagged.
 */
export const toFigmaColor = (css: string): Converted<FigmaRgba> => {
  const parsed = parseColor(css);
  if (!parsed) return { error: `not a colour: ${css}` };

  const { r, g, b, alpha } = toRgb(parsed);
  const clipped = [r, g, b].some(
    (c) => c < -GAMUT_EPSILON || c > 1 + GAMUT_EPSILON,
  );

  return {
    value: {
      r: round6(clamp01(r)),
      g: round6(clamp01(g)),
      b: round6(clamp01(b)),
      a: alpha ?? 1,
    },
    clipped,
  };
};

const REM = /^(-?[\d.]+)rem$/;
const PX = /^(-?[\d.]+)px$/;
const UNITLESS = /^-?[\d.]+$/;
/** `calc(a / b)` — how the type scale states a leading as a ratio of its size. */
const RATIO = /^calc\(\s*([\d.]+)\s*\/\s*([\d.]+)\s*\)$/;

/**
 * A CSS length or number as a Figma number. Figma variables are unitless and
 * mean px, so `rem` is resolved against `rootFontSize` — which makes the
 * conversion correct only for a document that has not moved its root size, and
 * that assumption is the caller's to declare.
 */
export const toFigmaNumber = (
  css: string,
  rootFontSize: number,
): Converted<number> => {
  const rem = REM.exec(css);
  if (rem) return { value: Number(rem[1]) * rootFontSize, clipped: false };

  const px = PX.exec(css);
  if (px) return { value: Number(px[1]), clipped: false };

  const ratio = RATIO.exec(css);
  if (ratio)
    return { value: Number(ratio[1]) / Number(ratio[2]), clipped: false };

  if (UNITLESS.test(css)) return { value: Number(css), clipped: false };

  return { error: `not a length or number: ${css}` };
};

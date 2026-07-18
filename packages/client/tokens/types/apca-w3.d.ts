/**
 * Minimal typings for `apca-w3` (ships none) — validation-test use only.
 * Kept outside `src/` so nothing of this lands in the published `dist`.
 */
declare module 'apca-w3' {
  /** Perceptual lightness contrast Lc; sign encodes polarity. */
  export function APCAcontrast(
    textY: number,
    backgroundY: number,
    places?: number,
  ): number | string;
  /** Luminance Y from an [r, g, b] 0–255 sRGB triplet. */
  export function sRGBtoY(rgb: [number, number, number]): number;
}

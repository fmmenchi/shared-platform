/**
 * Minimal typings for `apca-w3`, which ships none.
 *
 * Inside `src/` because `validateTheme()` measures APCA now, and the lib build
 * only includes `src/**\/*.ts` — a declaration parked beside it was invisible to
 * the build the moment the dependency stopped being test-only. Nothing of it
 * reaches `dist`: TypeScript emits no output for a `.d.ts` input, and `files`
 * publishes only `dist` and `src/styles`.
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

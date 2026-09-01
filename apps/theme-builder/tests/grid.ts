import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { parseTheme } from '@fmmenchi/theme';

import { REFERENCE_BASES, type Bases } from '../app/bases';

/**
 * THE 144-BRAND GRID — the harness the ramp's numbers were chosen on.
 *
 * 24 hues x 3 chroma levels x 2 lightnesses, with EVERY family given the same base.
 * That last part is what makes it harsh: no family can borrow contrast from a
 * neighbour happening to be different, which is a case a real brand never quite
 * reaches. It is what the dark end of 0.26 was measured against — 0.34 fails 120 of
 * these, 0.30 fails 60, 0.26 fails none.
 *
 * SHARED RATHER THAN COPIED, because two specs now measure against it: `ramp.spec.ts`
 * for the shipped numbers and `ramp-shape.spec.ts` for the shapes the wizard offers.
 * A second grid would be a second definition of "harsh", free to drift, and a claim
 * proved on one would be quoted about the other.
 */
const require = createRequire(import.meta.url);

/** The shipped contract, read through the package's own `exports`. */
export const DECLARED = parseTheme(
  readFileSync(require.resolve('@fmmenchi/tokens/styles/vars.css'), 'utf8'),
);

/** The families, in the contract's order. */
export const FAMILY_NAMES: readonly string[] = Object.keys(REFERENCE_BASES);

/** Every family given the same colour — the shape a grid entry takes. */
export const brandsAt = (css: string): Bases =>
  Object.fromEntries(FAMILY_NAMES.map((family) => [family, css])) as Bases;

/** Each entry is `[label, bases]`; the label is the colour, for a readable failure. */
export const GRID: readonly (readonly [string, Bases])[] = (() => {
  const brands: Array<readonly [string, Bases]> = [];

  for (let hue = 0; hue < 360; hue += 15) {
    for (const chroma of [0.05, 0.15, 0.3]) {
      for (const lightness of [0.35, 0.65]) {
        const css = `oklch(${lightness} ${chroma} ${hue})`;
        brands.push([css, brandsAt(css)]);
      }
    }
  }

  return brands;
})();

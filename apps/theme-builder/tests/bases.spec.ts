import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PALETTE_FAMILIES, parseCssVars, resolveCssVar } from '@fmmenchi/theme';
import { differenceEuclidean, converter, formatHex, parse } from 'culori';
import { describe, expect, it } from 'vitest';

import { REFERENCE_BASES } from '../app/bases';

/**
 * THE FORM'S DEFAULTS ARE THE SHIPPED BRAND, AND THIS IS WHAT KEEPS THEM SO.
 *
 * `vars.css` states the bases in oklch; the form needs hex, because that is what
 * `<input type="color">` gives and takes. Converting at run time would mean the app
 * carrying a colour library to render its own initial state, so the values are
 * converted once and written down — which is exactly the kind of copy that goes
 * stale in silence.
 *
 * It has already earned its place: the first version of that list was seven colours
 * guessed by eye, and every one of them was wrong.
 */
const varsPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../packages/client/tokens/src/styles/vars.css',
);

const toOklch = converter('oklch');
const deltaE = differenceEuclidean('oklch');

describe('REFERENCE_BASES', () => {
  const declared = parseCssVars(readFileSync(varsPath, 'utf8'));

  it('names every palette family, and nothing else', () => {
    // Seven, not eight: the greys are stated rather than derived (ADR-0032), so a
    // brand hands over the chromatic families only.
    expect(Object.keys(REFERENCE_BASES).sort()).toEqual(
      [...PALETTE_FAMILIES].sort(),
    );
  });

  it('is the shipped base of each family, converted', () => {
    const drift: string[] = [];

    for (const family of PALETTE_FAMILIES) {
      const raw = declared.get(`--fm-palette-${family}-base`);
      expect(raw, `${family} has no base in vars.css`).toBeTruthy();

      const shipped = resolveCssVar(raw as string, declared);
      const mine = REFERENCE_BASES[family];

      // Compared as COLOURS rather than as strings: hex is 8 bits per channel and
      // oklch is not, so the round trip is lossy by definition — what matters is
      // that the form opens on the colour a person would see, not that two
      // spellings match. A tenth of a JND is the tolerance; anything above it is a
      // different colour, not a rounding.
      const d = deltaE(toOklch(parse(shipped)), toOklch(parse(mine)));
      if (d > 0.004) {
        drift.push(
          `${family}: form has ${mine}, vars.css says ${shipped} (${formatHex(parse(shipped))}) — ΔE ${d.toFixed(4)}`,
        );
      }
    }

    expect(
      drift,
      `${drift.length} base(s) drifted from the shipped theme:\n  ${drift.join('\n  ')}`,
    ).toEqual([]);
  });

  it('is written as lowercase 6-digit hex, which is what the control returns', () => {
    // `<input type="color">` normalises its value to `#rrggbb` lowercase. A default
    // written any other way is not equal to what the control reports the moment a
    // person touches it, and "has this changed?" then answers wrongly.
    for (const [family, hex] of Object.entries(REFERENCE_BASES)) {
      expect(hex, family).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

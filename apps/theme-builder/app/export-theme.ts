import {
  generatePalette,
  PALETTE_FAMILIES,
  type Bases,
  type Declarations,
  type Ramp,
} from '@fmmenchi/theme';
import { converter, parse as parseColor } from 'culori';

/**
 * THE HANDOFF FILE — what the wizard produces, and the only thing it produces.
 *
 * The generator's job is to generate the theme; this app's job ends at the file it
 * is handed. A consumer runs
 *
 *     npx nx g @fmmenchi/nx-theme-generator:theme acme --from=./acme.theme.json
 *
 * and the generator writes the `[data-theme]` stylesheet, validating it first with
 * the same function CI runs. So there is no CSS emitter here: a second renderer for
 * the same bytes would be two renderings of one decision, and the theme a person
 * downloaded could then differ from the theme installed in their repo.
 *
 * DECLARATIONS AT EVERY LAYER, NOT THE 84 FINISHED COLOURS, which is the generator's
 * documented contract and the reason a consumer's theme behaves like ours rather
 * than merely looking like it. A file carrying only the resolved roles is a
 * photograph: same pixels, nothing left to recompute. Three layers ship:
 *
 *   the seven BASES        the brand's own colours
 *   every RUNG             what the ramp places under each base
 *   every ROLE             `var(--fm-palette-…)`, so re-pointing one still works
 *
 * THE RUNGS ARE RELATIVE COLOUR, exactly as `vars.css` writes them, and they used
 * not to be. Emitting literals here made a wizard-built theme WORSE than the design
 * system's own: change `--fm-palette-primary-base` in a theme from `vars.css` and
 * every rung and role above it follows, live in the browser; change it in a theme
 * this wizard had exported and nothing moved, because the rungs no longer named it.
 * The file boasted about not being a photograph at the role layer while being one at
 * the rung layer.
 *
 * It was not fixable while the two ramps disagreed — ours stated lightness absolutely
 * and the stylesheet stated offsets — and it is now, because they are the same ramp.
 * The offset is simply (rung lightness − base lightness), which is computable for any
 * brand.
 *
 * AND THE GREYS TRAVEL TOO. A custom property resolves WHERE IT IS DECLARED, so a
 * `[data-theme]` block that overrides only the bases is inert: the rungs already
 * settled at `:root`. Measured, and recorded in `draft-theme.tsx`. The stated greys
 * (ADR-0032) are copied verbatim from the design system's own declarations, because
 * no brand supplies them and 34 of the 84 roles point at them.
 */

/** What `--from` reads. Everything else in the file is ignored by the generator. */
export interface ThemeFile {
  readonly declarations: Record<string, string>;
  /**
   * The wizard's own record, so a person can reopen what they built. The generator
   * does not read it — its contract is `declarations` and nothing else — which is
   * exactly what makes it safe to keep here.
   */
  readonly builder: {
    readonly bases: Bases;
    readonly ramp: Ramp;
  };
}

const brandFamilies = new Set<string>(PALETTE_FAMILIES);

const toOklch = converter('oklch');

/**
 * Rounded, and the reason is measured rather than tidy: unrounded, the same brand
 * produced values differing at the seventeenth decimal between Node and Chromium, so
 * the file a person downloaded was not byte-identical to the one a test generated.
 */
const round = (n: number, places: number) => Number(n.toFixed(places));

/**
 * A hex from the colour input, as the oklch literal a stylesheet should carry.
 *
 * ROUNDED, and the reason is measured rather than tidy: unrounded, the same brand
 * produced values differing at the seventeenth decimal between Node and Chromium, so
 * the file a person downloaded was not byte-identical to the one a test generated.
 * `generatePalette` rounds its rungs for exactly this, at the same precision — four
 * places on lightness and chroma, two on hue, which is finer than the eye and finer
 * than `vars.css` states its own bases.
 */
function toOklchLiteral(hex: string): string {
  const parsed = toOklch(parseColor(hex));
  if (!parsed) {
    throw new Error(`Not a colour: ${JSON.stringify(hex)}.`);
  }

  // `h` is undefined for an achromatic colour — black, white, any grey a person
  // picks — and `oklch(l c )` is not a colour. Zero is the conventional hue there,
  // and with chroma at 0 it is unobservable.
  return `oklch(${round(parsed.l, 4)} ${round(parsed.c, 4)} ${round(parsed.h ?? 0, 2)})`;
}

/**
 * The file for these bases, against the design system's own declarations.
 *
 * `declared` is what the wizard's layout route read from `vars.css`: the role
 * aliases and the stated greys are taken from it verbatim, because they are already
 * in the shape a stylesheet wants and re-deriving them would be a second copy of a
 * decision that lives there.
 */
export function buildThemeFile(
  declared: Declarations,
  bases: Bases,
  ramp: Ramp,
): ThemeFile {
  const declarations: Record<string, string> = {};

  // LAYER ONE — the brand's seven, as oklch literals.
  for (const family of PALETTE_FAMILIES) {
    declarations[`--fm-palette-${family}-base`] = toOklchLiteral(bases[family]);
  }

  // LAYER TWO — the rungs, written as relative colour off their own base.
  //
  // THIS IS WHAT KEEPS A REBRAND SEVEN NUMBERS. It used to emit resolved literals,
  // and that quietly made a wizard-built theme worse than the design system's own:
  // change `--fm-palette-primary-base` in a theme from `vars.css` and every rung and
  // role above it follows, live, in the browser — `@fmmenchi/ui`'s
  // `token-overrides.test.tsx` is the test that defends it. Change it in a theme this
  // wizard had exported and nothing happened, because the rungs no longer named it.
  // The file boasted about not being a photograph at the ROLE layer while being one
  // at this layer.
  //
  // THE OFFSET AND THE FACTOR ARE READ BACK OUT OF THE GENERATED RUNG rather than
  // recomputed from the ramp, and that is what makes this exact. `generatePalette`
  // clamps chroma into sRGB while holding lightness, so a vivid brand's rung is NOT
  // `base.c * ramp.chromaFactor` — it is whatever survived. Taking the ratio of what
  // it produced gives a relative colour that resolves to precisely that colour, with
  // no second implementation of the clamp and nothing for the browser to clamp again.
  const palette = generatePalette(bases, ramp);
  for (const family of PALETTE_FAMILIES) {
    const base = toOklch(parseColor(bases[family]));
    const rungs = palette[family] as Record<number, string>;

    for (const step of Object.keys(rungs)) {
      const rung = toOklch(parseColor(rungs[Number(step)] as string));
      const offset = round((rung?.l ?? 0) - (base?.l ?? 0), 4);
      const factor =
        (base?.c ?? 0) < 1e-6 ? 1 : round((rung?.c ?? 0) / (base?.c ?? 1), 4);

      const l =
        offset === 0
          ? 'l'
          : `calc(l ${offset > 0 ? '+' : '-'} ${Math.abs(offset)})`;
      const c = factor === 1 ? 'c' : `calc(c * ${factor})`;

      declarations[`--fm-palette-${family}-${step}`] =
        `oklch(from var(--fm-palette-${family}-base) ${l} ${c} h)`;
    }
  }

  // …plus the families no brand supplies, verbatim. Filtered on the SAME set the
  // palette generator covers, so a family that becomes stated later needs no edit
  // here: whatever the brand does not provide is copied.
  for (const [name, value] of declared) {
    const stated = /^--fm-palette-([a-z]+)-/.exec(name);
    if (stated && !brandFamilies.has(stated[1] as string)) {
      declarations[name] = value;
    }
  }

  // LAYER THREE — every role, still pointing at a rung rather than holding a colour.
  for (const [name, value] of declared) {
    if (name.startsWith('--fm-color-')) declarations[name] = value;
  }

  return { declarations, builder: { bases, ramp } };
}

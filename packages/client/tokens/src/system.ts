/**
 * Read a `DesignSystem` OUT OF a stylesheet, rather than restating one.
 *
 * ADR-0033 puts a rule on this table before it exists: the rungs are already
 * declared in `vars.css`, so a second copy written by hand is a second source of
 * truth, and a second source of truth is how a gate goes green on the wrong
 * number. Derive it, or assert it against the stylesheet — never maintain it.
 * This is the derive half.
 *
 * It also settles what `--tokens` is for. A builder points this at the
 * CONSUMER's installed `@fmmenchi/tokens`, so a consumer whose ramp has
 * different rungs gets their own rungs rather than ours silently substituted.
 * Version skew stops being a hazard and becomes the input.
 *
 * HOW, and why not by parsing. The declarations are relative colour —
 * `oklch(from var(--…-base) calc(l - 0.14) calc(c * 0.96) h)` — and reading the
 * coefficients back out of those expressions would be a parser for our own
 * syntax, which breaks the moment a rung is written any other way: a literal, an
 * absolute lightness, a retuned curve. So nothing is parsed. Each rung is
 * RESOLVED to the colour a browser would paint, and the numbers are recovered
 * from the result — `lightness` is its L, and `chromaFactor` is its chroma over
 * the base's. Whatever shape the stylesheet uses, the answer is the same.
 *
 * One consequence worth stating: a rung whose chroma was clamped into sRGB
 * yields the CLAMPED factor. That is the shipped scale described honestly — it
 * is what the browser paints — but it is not the curve somebody wrote, and the
 * two differ exactly where the gamut bit.
 */
import { converter, parse as parseColor } from 'culori';

import { readVars } from './read-vars.js';
import { resolveAll } from './resolve.js';
import { PALETTE_FAMILIES } from './tokens.js';
import type {
  Base,
  DesignSystem,
  NeutralDefinition,
  PaletteFamily,
  Ramp,
  Rung,
  ThemeDefinition,
} from './theme.types.js';

const toOklch = converter('oklch');

/** One stylesheet of a theme, as text, with the selector it declares under. */
export interface ThemeSource {
  /** `ThemeDefinition.name`. */
  readonly name: string;
  readonly selector: string;
  readonly colorScheme: 'light' | 'dark';
  /**
   * The two inks a fill may carry, as neutral steps.
   *
   * DECLARED, not derived, and the one thing here that is. Which greys a
   * foreground may use is a policy — a decision about legibility — not a fact
   * recoverable from the ramp. Reading it back from whatever the shipped roles
   * happen to point at today would turn one theme's current assignments into a
   * rule for every theme built afterwards.
   */
  readonly inks: readonly [lighter: number, darker: number];
  /** The stylesheet's text. */
  readonly css: string;
}

function channels(value: string): {
  l: number;
  c: number;
  h: number | undefined;
} {
  const parsed = parseColor(value);
  if (!parsed) throw new Error(`unparsable colour: ${value}`);
  const { l, c, h } = toOklch(parsed);
  return { l, c, h: h === undefined || Number.isNaN(h) ? undefined : h };
}

/** Every `--fm-palette-<prefix>-<step>` in a resolved cascade, ordered light to dark. */
function rungsOf(
  resolved: ReadonlyMap<string, string>,
  prefix: string,
  baseChroma: number,
): Ramp {
  const pattern = new RegExp(`^--fm-palette-${prefix}-(\\d+)$`);
  const rungs: Rung[] = [];

  for (const [name, value] of resolved) {
    const match = pattern.exec(name);
    if (!match) continue;
    const { l, c } = channels(value);
    rungs.push({
      step: Number(match[1]),
      lightness: l,
      // A base with no chroma cannot scale one; every rung of it is achromatic.
      chromaFactor: baseChroma === 0 ? 0 : c / baseChroma,
    });
  }

  return rungs.sort((a, b) => b.lightness - a.lightness);
}

function baseOf(resolved: ReadonlyMap<string, string>, name: string): Base {
  const declared = resolved.get(name);
  if (declared === undefined) throw new Error(`missing base: ${name}`);
  const { l, c, h } = channels(declared);
  return { hue: h, chroma: c, lightness: l };
}

/**
 * The grey scale, described the way a family is.
 *
 * Its base is not declared — there is no `--fm-palette-neutral-base` — so it is
 * RECOVERED: the hue every chromatic rung shares, and the maximum chroma any of
 * them reaches, which is what the factors are relative to. The achromatic
 * endpoints contribute no hue and a factor of zero.
 */
function neutralOf(resolved: ReadonlyMap<string, string>): NeutralDefinition {
  const rungs: { step: number; l: number; c: number; h: number | undefined }[] =
    [];

  for (const [name, value] of resolved) {
    const match = /^--fm-palette-neutral-(\d+)$/.exec(name);
    if (!match) continue;
    const { l, c, h } = channels(value);
    rungs.push({ step: Number(match[1]), l, c, h });
  }
  if (rungs.length === 0) throw new Error('no neutral rungs declared');

  const chroma = Math.max(...rungs.map((r) => r.c));
  // A hue on a zero-chroma colour is meaningless, and culori reports it as 0
  // rather than as absent — so the endpoints are excluded by their CHROMA. Left
  // to `h`, pure white and pure black would look like a second hue and make the
  // scale undescribable.
  const hues = [
    ...new Set(
      rungs
        .filter((r) => r.c > 0)
        .map((r) => r.h)
        .filter((h) => h !== undefined),
    ),
  ];
  if (hues.length > 1) {
    throw new Error(
      `the neutral scale mixes hues (${hues.join(', ')}); a single base cannot describe it`,
    );
  }

  rungs.sort((a, b) => b.l - a.l);
  return {
    base: {
      hue: hues[0],
      chroma,
      // The rung the factors peak at: the scale's own darkest full-chroma grey.
      lightness: rungs.find((r) => r.c === chroma)?.l ?? 0,
    },
    ramp: rungs.map((r) => ({
      step: r.step,
      lightness: r.l,
      chromaFactor: chroma === 0 ? 0 : r.c / chroma,
    })),
  };
}

/**
 * Describe a design system from its stylesheets.
 *
 * `sources` are given in cascade order, each carrying the text that theme
 * declares. A theme's cascade is every earlier source plus its own, which is
 * what the browser does and what lets `dark` reference the greys it never
 * redeclares.
 */
export function describeSystem(sources: readonly ThemeSource[]): DesignSystem {
  if (sources.length === 0)
    throw new Error('a system needs at least one theme');

  const cascade = new Map<string, string>();
  const themes: ThemeDefinition[] = [];
  let neutral: NeutralDefinition | undefined;

  for (const source of sources) {
    for (const [name, value] of readVars(source.css)) cascade.set(name, value);
    const resolved = resolveAll(cascade);

    const ramps = {} as Record<PaletteFamily, Ramp>;
    for (const family of PALETTE_FAMILIES) {
      const base = baseOf(resolved, `--fm-palette-${family}-base`);
      ramps[family] = rungsOf(resolved, family, base.chroma);
    }

    themes.push({
      name: source.name,
      selector: source.selector,
      colorScheme: source.colorScheme,
      ramps,
      inks: source.inks,
    });

    neutral = neutralOf(resolved);
  }

  if (neutral === undefined) throw new Error('no neutral scale declared');
  return { families: [...PALETTE_FAMILIES], neutral, themes };
}

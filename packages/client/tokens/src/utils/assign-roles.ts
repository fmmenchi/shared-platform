/**
 * ASSIGNING ROLES — which rung each of the 84 roles points at.
 *
 * Level 2 to level 3 of the token architecture (ADR-0032). `generatePalette`
 * decided what colours EXIST; this decides what each one is FOR, and the two are
 * separate because they fail differently: a rung is wrong when it leaves sRGB or
 * the ramp, a role is wrong when it cannot be read on the thing behind it.
 *
 * THERE IS NOTHING TO SOLVE HERE, and that was worth measuring before writing a
 * solver. Read off the shipped themes, all 84 roles land EXACTLY on a rung —
 * ΔE 0.0000, not "close" — with one exception (`scrim`, a rung plus alpha). No
 * search, no contrast probing: the rungs are placed at absolute lightness by
 * `generatePalette`, so a role that clears its floor at a given step clears it
 * for every brand. `validateTheme` still checks, because a brand may hand over a
 * base whose gamut clamps a rung out of range — but it checks a result, it does
 * not produce one.
 *
 * WHY A TABLE AND NOT A DERIVATION. This is policy, not contract: another design
 * system could satisfy the same `CONTRAST_PAIRS` with different placements and
 * be equally correct. The package's own rule says a file that only RESTATES the
 * contract is generated while a file that DECIDES something is written — these
 * placements decide, so they are written.
 *
 * The chromatic families need only nine lines because the regularity is real
 * rather than assumed: measured across all eight role families, every one places
 * its suffixes at the same steps. `neutral` and the surfaces are listed one by
 * one instead, and not out of laziness — the neutral ramp is addressed in
 * PER-MILLE OF LIGHTNESS (`neutral-620` means L 0.38, exactly `1 - 620/1000` on
 * all 36 shipped rungs) while a chromatic ramp is addressed by ordinal step. Two
 * vocabularies, so no shared rule can span them.
 */
import { formatCss, parse as parseColor } from 'culori';

import {
  ACTION_FAMILIES,
  ACTION_SUFFIXES,
  STATUS_FAMILIES,
  STATUS_SUFFIXES,
} from '../tokens.types.js';
import type { ColorRole, PaletteFamily, Theme } from '../tokens.types.js';
import type { Palette } from '../palette.js';

/**
 * Light or dark. Not a preference but a different THEME: the two ship different
 * placements for all but one of the 84 roles (`disabled-foreground`, which sits
 * at `neutral-400` in both), so they are two tables rather than one table read
 * two ways.
 */
export type ColorScheme = 'light' | 'dark';

/** A rung, named. `family` omitted means the role's own family. */
interface Placement {
  readonly family?: PaletteFamily;
  readonly step: number;
  /** Set only where a role is a rung seen THROUGH something — `scrim`. */
  readonly alpha?: number;
}

/**
 * Which palette family a ROLE family draws from.
 *
 * Only two entries, because only two disagree: `destructive` (a button) and
 * `error` (an alert) are one red under two treatments, so eight role families
 * sit over seven chromatic palette families.
 */
const PALETTE_OF: Partial<Record<string, PaletteFamily>> = {
  destructive: 'negative',
  error: 'negative',
};

/**
 * Where each suffix sits, for every chromatic family that has it.
 *
 * Read straight off the shipped presets, where all eight families agree. Light
 * darkens as a control gets more pressed (700 → 800 → 900); dark LIGHTENS
 * (500 → 400 → 300), because on a dark ground the way to look raised is to come
 * forward, not to sink. The washes go the same way — 100 on light, 1300 on dark,
 * the far end in each direction.
 */
const SUFFIX_STEPS: Readonly<
  Record<ColorScheme, Readonly<Record<string, Placement>>>
> = {
  light: {
    '': { step: 700 },
    '-foreground': { family: 'neutral', step: 0 },
    '-hover': { step: 800 },
    '-active': { step: 900 },
    '-subtle': { step: 100 },
    '-subtle-foreground': { step: 800 },
    '-disabled': { step: 200 },
    '-disabled-foreground': { step: 100 },
    '-border': { step: 700 },
  },
  dark: {
    '': { step: 500 },
    '-foreground': { family: 'neutral', step: 760 },
    '-hover': { step: 400 },
    '-active': { step: 300 },
    '-subtle': { step: 1300 },
    '-subtle-foreground': { step: 100 },
    '-disabled': { step: 1100 },
    '-disabled-foreground': { step: 1300 },
    '-border': { step: 500 },
  },
};

/**
 * The roles no suffix rule can reach: the neutral family, the surfaces, the
 * inputs. Listed because the neutral ramp speaks lightness where the chromatic
 * ones speak ordinals, and because a surface's step is a composition decision
 * (how far `card` floats above `background`) rather than an instance of a
 * pattern.
 */
const EXPLICIT: Readonly<
  Record<ColorScheme, Readonly<Partial<Record<ColorRole, Placement>>>>
> = {
  light: {
    neutral: { family: 'neutral', step: 540 },
    'neutral-foreground': { family: 'neutral', step: 0 },
    'neutral-subtle': { family: 'neutral', step: 50 },
    'neutral-subtle-foreground': { family: 'neutral', step: 620 },
    'neutral-border': { family: 'neutral', step: 540 },
    disabled: { family: 'neutral', step: 35 },
    'disabled-foreground': { family: 'neutral', step: 400 },
    background: { family: 'neutral', step: 15 },
    foreground: { family: 'neutral', step: 760 },
    card: { family: 'neutral', step: 0 },
    'card-foreground': { family: 'neutral', step: 760 },
    popover: { family: 'neutral', step: 0 },
    'popover-foreground': { family: 'neutral', step: 760 },
    muted: { family: 'neutral', step: 35 },
    'muted-foreground': { family: 'neutral', step: 620 },
    border: { family: 'neutral', step: 90 },
    ring: { family: 'primary', step: 600 },
    scrim: { family: 'neutral', step: 850, alpha: 0.92 },
    link: { family: 'primary', step: 700 },
    'link-hover': { family: 'primary', step: 800 },
    selection: { family: 'primary', step: 100 },
    'selection-foreground': { family: 'primary', step: 800 },
    tooltip: { family: 'neutral', step: 760 },
    'tooltip-foreground': { family: 'neutral', step: 35 },
    input: { family: 'neutral', step: 90 },
    'input-foreground': { family: 'neutral', step: 760 },
    'input-hover': { family: 'neutral', step: 50 },
    'input-active': { family: 'neutral', step: 90 },
    'input-invalid': { family: 'negative', step: 500 },
    'input-disabled': { family: 'neutral', step: 35 },
    'input-placeholder': { family: 'neutral', step: 620 },
    'input-border': { family: 'neutral', step: 420 },
  },
  dark: {
    neutral: { family: 'neutral', step: 260 },
    'neutral-foreground': { family: 'neutral', step: 760 },
    'neutral-subtle': { family: 'neutral', step: 690 },
    'neutral-subtle-foreground': { family: 'neutral', step: 180 },
    'neutral-border': { family: 'neutral', step: 260 },
    disabled: { family: 'neutral', step: 690 },
    'disabled-foreground': { family: 'neutral', step: 400 },
    background: { family: 'neutral', step: 790 },
    foreground: { family: 'neutral', step: 50 },
    card: { family: 'neutral', step: 740 },
    'card-foreground': { family: 'neutral', step: 50 },
    popover: { family: 'neutral', step: 740 },
    'popover-foreground': { family: 'neutral', step: 50 },
    muted: { family: 'neutral', step: 690 },
    'muted-foreground': { family: 'neutral', step: 260 },
    border: { family: 'neutral', step: 660 },
    ring: { family: 'primary', step: 500 },
    scrim: { family: 'neutral', step: 900, alpha: 0.94 },
    link: { family: 'primary', step: 500 },
    'link-hover': { family: 'primary', step: 400 },
    selection: { family: 'primary', step: 1200 },
    // The one placement that is a DEFECT reproduced rather than a decision:
    // `neutral-30` carries chroma 0.014 between neighbours at 0.004 and 0.006,
    // breaking a curve monotone across all 36 other rungs, and it lands on
    // selected text. Generating the ramp is what retires it — the table points
    // at a step, and a generated step cannot be an outlier.
    'selection-foreground': { family: 'neutral', step: 30 },
    tooltip: { family: 'neutral', step: 50 },
    'tooltip-foreground': { family: 'neutral', step: 760 },
    input: { family: 'neutral', step: 690 },
    'input-foreground': { family: 'neutral', step: 50 },
    'input-hover': { family: 'neutral', step: 660 },
    'input-active': { family: 'neutral', step: 620 },
    'input-invalid': { family: 'negative', step: 600 },
    'input-disabled': { family: 'neutral', step: 740 },
    'input-placeholder': { family: 'neutral', step: 260 },
    'input-border': { family: 'neutral', step: 440 },
  },
};

/** Every role's placement for one scheme: the suffix rules, then the listed ones. */
function placementsFor(scheme: ColorScheme): ReadonlyMap<ColorRole, Placement> {
  const table = new Map<ColorRole, Placement>();
  const suffixes = SUFFIX_STEPS[scheme];

  const add = (
    families: readonly string[],
    familySuffixes: readonly string[],
  ) => {
    for (const family of families) {
      for (const suffix of familySuffixes) {
        const rule = suffixes[suffix];
        if (!rule) continue;
        table.set(`${family}${suffix}` as ColorRole, {
          ...rule,
          family:
            rule.family ?? PALETTE_OF[family] ?? (family as PaletteFamily),
        });
      }
    }
  };

  add(ACTION_FAMILIES, ACTION_SUFFIXES);
  add(STATUS_FAMILIES, STATUS_SUFFIXES);

  for (const [role, placement] of Object.entries(EXPLICIT[scheme])) {
    table.set(role as ColorRole, placement);
  }
  return table;
}

/**
 * Point every role at its rung.
 *
 * THROWS when the palette has no rung a placement names, listing the missing
 * ones together. A role left undefined resolves to its `@property`
 * initial-value — opaque black, in both themes, with nothing falsy to branch on
 * — so the theme would look complete, validate as complete, and paint wrong. The
 * usual cause is a ramp too coarse for the scheme: dark reads steps up to 1300
 * and the neutral placements reach into per-mille lightness, so a nine-rung ramp
 * everywhere cannot serve either.
 */
export function assignRoles(palette: Palette, scheme: ColorScheme): Theme {
  const theme: Partial<Record<ColorRole, string>> = {};
  const missing: string[] = [];

  for (const [role, { family, step, alpha }] of placementsFor(scheme)) {
    const rung = family === undefined ? undefined : palette[family]?.[step];
    if (rung === undefined) {
      missing.push(`${role} -> ${String(family)}-${step}`);
      continue;
    }
    if (alpha === undefined) {
      theme[role] = rung;
      continue;
    }
    const parsed = parseColor(rung);
    if (!parsed) {
      missing.push(`${role} -> ${String(family)}-${step} (unparsable)`);
      continue;
    }
    theme[role] = formatCss({ ...parsed, alpha });
  }

  if (missing.length > 0) {
    throw new Error(
      `The palette has no rung for ${missing.length} role(s): ${missing.join(', ')}.`,
    );
  }
  return theme as Theme;
}

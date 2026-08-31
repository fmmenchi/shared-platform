/**
 * GENERATING A THEME — a palette plus a map becomes 84 resolved colours.
 *
 * Level 2 to level 3 of the token architecture (ADR-0032). `generatePalette`
 * decided what colours EXIST; this decides what each one is FOR — and it decides
 * nothing on its own, which is the point. The mapping arrives as data, read from a
 * stylesheet by `toPlacements`, so the design work stays in the one file that has
 * always held it and this module is only substitution.
 *
 * THERE IS NOTHING TO SOLVE HERE, and that was measured before it was written.
 * Read off the shipped themes, all 84 roles land EXACTLY on a rung — ΔE 0.0000, not
 * "close" — with one exception, `scrim`, which is a rung plus alpha. No search, no
 * contrast probing: `generatePalette` places rungs at absolute lightness, so a role
 * that clears its floor at a given step clears it for every brand.
 *
 * `validateTheme` still runs afterwards, and it is not ceremony: a brand may hand
 * over a base whose gamut clamps a rung out of range, and then a pair that cleared
 * its floor for one brand does not for this one. It judges a result; it does not
 * produce one.
 */
import { formatCss, parse as parseColor } from 'culori';

import type { Placements } from './placements.js';
import type { Palette } from './palette.js';
import type { ColorRole, Theme } from './tokens.types.js';

/**
 * Point every placed role at its rung.
 *
 * THROWS when the palette has no rung a placement names, listing the roles that
 * wanted it. A role left undefined resolves to its `@property` initial-value —
 * opaque black, in both themes, with nothing falsy to branch on — so the hole would
 * survive every check that inspects what is present. The usual cause is a palette
 * generated from a ramp that does not reach the steps the stylesheet names: a
 * nine-rung ramp cannot serve a map written against thirteen.
 *
 * A role the placements do not mention is simply absent from the result, and that
 * is `validateTheme`'s `missing-role` to report rather than this function's to
 * invent. Two reasons to keep them apart: a caller may deliberately generate part
 * of a theme, and a validator that is handed a guess cannot tell it from a value.
 */
export function generateTheme(
  palette: Palette,
  placements: Placements,
): Partial<Theme> {
  const theme: Partial<Record<ColorRole, string>> = {};
  const missing: string[] = [];

  for (const [role, { family, step, alpha }] of placements) {
    const rung = palette[family]?.[step];
    if (rung === undefined) {
      missing.push(`${role} -> ${family}-${step}`);
      continue;
    }

    if (alpha === undefined) {
      theme[role] = rung;
      continue;
    }

    // A rung seen through something. Parsed and re-formatted rather than string
    // surgery, because the rung's own notation is `generatePalette`'s to change and
    // this should not know what it looks like.
    const parsed = parseColor(rung);
    if (!parsed) {
      missing.push(`${role} -> ${family}-${step} (rung is not a colour)`);
      continue;
    }
    theme[role] = formatCss({ ...parsed, alpha });
  }

  if (missing.length > 0) {
    throw new Error(
      `The palette has no rung for ${missing.length} role(s): ${missing.join(', ')}.`,
    );
  }
  return theme;
}

/**
 * WHERE EACH ROLE POINTS — read, never written.
 *
 * A theme is 84 semantic roles, and every one of them names a rung:
 * `--fm-color-primary: var(--fm-palette-primary-700)`. That mapping is the design
 * work, it already exists in exactly one place, and the whole point of this module
 * is that it stays there.
 *
 * THIS IS THE SECOND ATTEMPT, and the first is worth knowing about. It was a table
 * of 84 entries per scheme, written out in TypeScript by reading the shipped
 * stylesheets — and its test was "it reproduces both stylesheets exactly", which
 * proved the transcription was faithful and nothing else. It also put one decision
 * in two files: the 84 `var()` lines in `vars.css` and 41 entries beside them,
 * obliged to agree forever. It was reverted for that, and for having no caller.
 *
 * Reading it instead has three consequences worth stating:
 *
 *   - THE MAP IS THE CONSUMER'S. The Nx generator reads the `@fmmenchi/tokens`
 *     INSTALLED in the workspace, so a theme it builds points roles the way that
 *     version does. Nothing here is frozen at this package's release.
 *   - THERE IS NOTHING TO KEEP IN STEP. A role retuned in `vars.css` changes what
 *     every generated theme does, with no second edit and no test to remind
 *     anybody.
 *   - AND A HOUSE THAT WANTS DIFFERENT PLACEMENTS writes a stylesheet, not a fork.
 *     `toPlacements` reads whatever it is given.
 */
import { COLOR_ROLES, colorVar } from './tokens.types.js';
import type { ColorRole, PaletteFamily } from './tokens.types.js';

/** A rung, named — plus the alpha, where a role is a rung seen through something. */
export interface Placement {
  readonly family: PaletteFamily;
  readonly step: number;
  /** 0–1. Present only where the declaration carried one. */
  readonly alpha?: number;
}

/** Every role that named a rung, and where it pointed. */
export type Placements = ReadonlyMap<ColorRole, Placement>;

/** `var(--fm-palette-<family>-<step>)` — how 83 of the 84 roles are written. */
const RUNG = /^var\(\s*--fm-palette-([a-z]+)-(\d+)\s*\)$/;

/**
 * `oklch(from var(--fm-palette-<family>-<step>) l c h / <alpha>)` — how the 84th
 * is. `scrim` is a rung seen through something, and the relative-colour form is how
 * `vars.css` says so: take that rung, keep its channels, change its alpha.
 *
 * Deliberately narrow. It matches the ONE form the stylesheet uses and refuses
 * every other, rather than trying to be a colour parser: a role written in some
 * shape this does not know is left out of the map, where a caller can see it
 * missing, instead of being guessed at.
 */
const RUNG_WITH_ALPHA =
  /^oklch\(\s*from\s+var\(\s*--fm-palette-([a-z]+)-(\d+)\s*\)\s+l\s+c\s+h\s*\/\s*([0-9.]+)\s*\)$/;

/**
 * The placements a stylesheet declares.
 *
 * Roles whose value is not a rung reference are SKIPPED rather than refused — a
 * theme may legitimately state a colour outright, and a reader that threw on the
 * first literal could not read a hand-written brand preset at all. What the caller
 * gets is a map of what was found; `generateTheme` is where a missing role becomes
 * an error, because that is where the completeness of the RESULT is decided.
 */
export function toPlacements(
  declared: ReadonlyMap<string, string>,
): Placements {
  const placements = new Map<ColorRole, Placement>();

  for (const role of COLOR_ROLES) {
    const value = declared.get(colorVar(role));
    if (value === undefined) continue;

    const flat = value.replace(/\s+/g, ' ').trim();

    const rung = RUNG.exec(flat);
    if (rung) {
      placements.set(role, {
        family: rung[1] as PaletteFamily,
        step: Number(rung[2]),
      });
      continue;
    }

    const withAlpha = RUNG_WITH_ALPHA.exec(flat);
    if (withAlpha) {
      placements.set(role, {
        family: withAlpha[1] as PaletteFamily,
        step: Number(withAlpha[2]),
        alpha: Number(withAlpha[3]),
      });
    }
  }

  return placements;
}

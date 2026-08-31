/**
 * WHICH RUNG EACH ROLE POINTS AT — read from a stylesheet, never written.
 *
 * A theme is 84 semantic roles, and every one of them names a rung:
 * `--fm-color-primary: var(--fm-palette-primary-700)`. In design-token terms that
 * is an ALIAS — a token holding no value of its own, only a reference to another —
 * which is also how DTCG expresses it, and it is why the word is worth using over
 * the "placement" this file was first called. That name meant nothing in this
 * domain, and `Placement` is already taken across the workspace: `@fmmenchi/ui`
 * uses it for where an anchored surface sits relative to its trigger, which is the
 * standard floating-UI meaning.
 *
 * INTERNAL, and that is the second correction. It was exported, so the wizard
 * assembled a theme itself — read the aliases, read the greys, generate the brand's
 * ramps, merge two halves, then call `generateTheme` with the result. Four steps in
 * a consumer for one question, and every one of them a chance to get the assembly
 * wrong. `generateTheme` takes the declarations now and does all of it, so this is
 * a piece of that function rather than a concept anybody outside has to hold.
 *
 * The ALIAS as something a person edits — re-pointing `--fm-color-primary` at rung
 * 600 — is an app's concern, because an app's form is where that decision would be
 * made. If the theme-builder grows that screen it defines the shape its form needs;
 * nothing here is that shape.
 */
import { COLOR_ROLES, colorVar } from '../tokens.types.js';
import type { ColorRole, PaletteFamily } from '../tokens.types.js';

/** A rung, named — plus the alpha, where a role is a rung seen through something. */
export interface Alias {
  readonly family: PaletteFamily;
  readonly step: number;
  /** 0–1. Present only where the declaration carried one. */
  readonly alpha?: number;
}

/** Every role that named a rung, and where it pointed. */
export type Aliases = ReadonlyMap<ColorRole, Alias>;

/** `var(--fm-palette-<family>-<step>)` — how 83 of the 84 roles are written. */
const RUNG = /^var\(\s*--fm-palette-([a-z]+)-(\d+)\s*\)$/;

/**
 * `oklch(from var(--fm-palette-<family>-<step>) l c h / <alpha>)` — how the 84th
 * is. `scrim` is a rung seen through something, and the relative-colour form is how
 * `vars.css` says so: take that rung, keep its channels, change its alpha.
 *
 * Deliberately narrow. It matches the ONE form the stylesheet uses and refuses
 * every other, rather than trying to be a colour parser: a role written in some
 * shape this does not know is left out of the map, where the caller can see it
 * missing, instead of being guessed at. A ramp expression names a rung AND alters
 * it, so reading the rung out of one would report an alias whose colour is not the
 * colour the role resolves to — plausible and wrong, which is worse than absent.
 */
const RUNG_WITH_ALPHA =
  /^oklch\(\s*from\s+var\(\s*--fm-palette-([a-z]+)-(\d+)\s*\)\s+l\s+c\s+h\s*\/\s*([0-9.]+)\s*\)$/;

/**
 * The aliases a stylesheet declares.
 *
 * Roles whose value is not a rung reference are SKIPPED rather than refused — a
 * theme may legitimately state a colour outright, and a reader that threw on the
 * first literal could not read a hand-written brand preset at all. What the caller
 * gets is a map of what was found; `generateTheme` is where a missing role becomes
 * an error, because that is where the completeness of the RESULT is decided.
 */
export function readAliases(declared: ReadonlyMap<string, string>): Aliases {
  const aliases = new Map<ColorRole, Alias>();

  for (const role of COLOR_ROLES) {
    const value = declared.get(colorVar(role));
    if (value === undefined) continue;

    const flat = value.replace(/\s+/g, ' ').trim();

    const rung = RUNG.exec(flat);
    if (rung) {
      aliases.set(role, {
        family: rung[1] as PaletteFamily,
        step: Number(rung[2]),
      });
      continue;
    }

    const withAlpha = RUNG_WITH_ALPHA.exec(flat);
    if (withAlpha) {
      aliases.set(role, {
        family: withAlpha[1] as PaletteFamily,
        step: Number(withAlpha[2]),
        alpha: Number(withAlpha[3]),
      });
    }
  }

  return aliases;
}

/**
 * THE INTERCHANGE FORMAT — what one process writes and another reads.
 *
 * A theme builder and the generator that installs its output are separate
 * processes (ADR-0033): one handoff, one file, no socket. This is the shape of
 * that file, and the function that reads it back.
 *
 * WRITING NEEDS NO FUNCTION. A `Theme` is a `Record<ColorRole, string>` and a
 * `Palette` is families of rungs — both are already JSON, so `JSON.stringify` is
 * the whole of it. Adding a `toThemeFile` would wrap an object literal in a call
 * and give a reader something new to learn for nothing.
 *
 * READING is the half that needs care, because what arrives is `unknown` and the
 * process that wrote it has already exited. A malformed file that parses into
 * `undefined`s produces a theme of missing roles, reported far from the cause; so
 * this checks the SHAPE and says which part is wrong.
 *
 * It stops at the shape. Whether the colours are legible is `validateTheme`'s
 * question, and a file can be perfectly formed and still describe a theme nobody
 * should ship.
 */
import type { Palette } from './palette.js';
import { PALETTE_FAMILIES } from './tokens.types.js';
import type { Theme } from './tokens.types.js';

/**
 * One theme, written down: its name, the rungs it was built on, and the role
 * assignments for every theme the design system defines.
 *
 * The PALETTE travels with it deliberately. A theme alone is 84 colours with no
 * account of where they came from — a reader could not tell a rung from a hand
 * picked value, and the app that reopens the file could not show the ramps a
 * person chose from without generating them again and hoping they match.
 */
export interface ThemeFile {
  readonly name: string;
  readonly palette: Palette;
  /** Keyed by theme name: `base`, `dark`, or whatever the system defines. */
  readonly themes: Readonly<Record<string, Theme>>;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isStringMap = (v: unknown): v is Record<string, string> =>
  isRecord(v) && Object.values(v).every((x) => typeof x === 'string');

/**
 * Read a theme file, or throw saying which part of it is wrong.
 *
 * Throws rather than returning a partial: a caller that gets half a file back has
 * to decide what half means, and the honest answer — that the file is unusable —
 * is the one this already knows.
 */
export function parseThemeFile(json: unknown): ThemeFile {
  const bad = (why: string): never => {
    throw new Error(`Not a theme file: ${why}.`);
  };

  if (!isRecord(json)) bad('expected an object');
  const file = json as Record<string, unknown>;

  if (typeof file['name'] !== 'string' || file['name'] === '') {
    bad('`name` must be a non-empty string');
  }

  if (!isRecord(file['palette'])) bad('`palette` must be an object');
  const palette = file['palette'] as Record<string, unknown>;
  for (const family of PALETTE_FAMILIES) {
    const rungs = palette[family];
    if (!isStringMap(rungs)) {
      bad(`\`palette.${family}\` must map each rung to a colour`);
    }
  }

  if (!isRecord(file['themes'])) bad('`themes` must be an object');
  const themes = file['themes'] as Record<string, unknown>;
  if (Object.keys(themes).length === 0) bad('`themes` is empty');
  for (const [name, theme] of Object.entries(themes)) {
    if (!isStringMap(theme)) {
      bad(`\`themes.${name}\` must map each role to a colour`);
    }
  }

  return file as unknown as ThemeFile;
}

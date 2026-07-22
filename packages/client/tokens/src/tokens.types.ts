/**
 * The token CONTRACT as types — what "a theme" IS. Every type here is DERIVED
 * from the `as const` arrays in `./tokens.ts` (the single source of truth), so
 * the runtime checklist and the compile-time shape can never drift.
 */
import type {
  ACTION_FAMILIES,
  ACTION_SUFFIXES,
  STATUS_FAMILIES,
  STATUS_SUFFIXES,
  NEUTRAL_ROLES,
  SURFACE_ROLES,
  INPUT_ROLES,
  REFERENCE_PRESETS,
} from './tokens.js';

export type ActionFamily = (typeof ACTION_FAMILIES)[number];
type ActionSuffix = (typeof ACTION_SUFFIXES)[number];

export type StatusFamily = (typeof STATUS_FAMILIES)[number];
type StatusSuffix = (typeof STATUS_SUFFIXES)[number];

export type ColorRole =
  | `${ActionFamily}${ActionSuffix}`
  | `${StatusFamily}${StatusSuffix}`
  | (typeof NEUTRAL_ROLES)[number]
  | (typeof SURFACE_ROLES)[number]
  | (typeof INPUT_ROLES)[number];

/**
 * A THEME is a complete assignment of every color role — this is what "the
 * allowed themes" means. Presets in apps must satisfy this shape.
 */
export type ThemeColors = Record<ColorRole, string>;

/** Presets the platform ships as reference themes. `base` is `:root`. */
export type ReferencePreset = (typeof REFERENCE_PRESETS)[number];

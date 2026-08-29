import type { ColorRole } from '@fmmenchi/tokens';

/** One role, with the custom property a consumer would actually write. */
export type RoleEntry = {
  role: ColorRole;
  /** The `--fm-color-*` name — what appears in a stylesheet, not a hex. */
  property: string;
};

/** A named strip of roles: an action family, a status family, or a prefix. */
export type RoleGroup = {
  name: string;
  entries: RoleEntry[];
};

/** One value in the palette, and every role that resolves to it. */
export type Shade = {
  value: string;
  lightness: number;
  chroma: number;
  hue: number;
  /** Every role sharing this exact value — often more than one. */
  roles: ColorRole[];
};

/**
 * A hue family, reconstructed from the values rather than read from a file.
 *
 * `hue` is the representative angle; `neutral` marks the near-zero-chroma
 * cluster, where the angle carries no meaning and grouping by it would be
 * grouping by noise.
 */
export type HueFamily = {
  hue: number;
  neutral: boolean;
  shades: Shade[];
};

/**
 * A declared foreground/background pair.
 *
 * `exempt` marks the disabled pairs, which WCAG 1.4.3 excludes from the
 * contrast minimum. They are still SHOWN — a number nobody is allowed to hide
 * is how you notice one that has drifted far past "low on purpose".
 */
export type ColorPair = {
  background: ColorRole;
  foreground: ColorRole;
  exempt: boolean;
};

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

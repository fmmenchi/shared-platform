/**
 * The CONFIGURATION shape — how a CSS custom-property contract maps onto Figma
 * variables. Declarative on purpose: a rule is a pattern, a path template and a
 * scope list, never a callback, so a contract can be reviewed as data and
 * diffed in a PR instead of being read as code.
 */

/** The two Figma variable types a CSS token can become. Figma has more; a
 *  custom property carries neither booleans nor node references. */
export type FigmaVariableType = 'COLOR' | 'FLOAT';

/**
 * One mapping rule. Rules are ordered and the FIRST match wins, so a narrow
 * rule must precede the broad one it is an exception to.
 */
export interface TokenRule {
  /** Anchored regex source matched against the full `--*` property name. */
  readonly match: string;
  /**
   * Figma variable path, `/`-separated. `$1`…`$9` interpolate capture groups;
   * `$2|default` substitutes `default` when the group is empty — the case of a
   * family's bare role (`--fm-color-primary`), which has no suffix to name it.
   */
  readonly path: string;
  readonly type: FigmaVariableType;
  /**
   * Figma variable scopes — which property pickers offer this variable. Set
   * deliberately: the API default (`ALL_SCOPES`) offers every variable for
   * every property, which makes the picker useless at contract size.
   */
  readonly scopes: readonly string[];
}

/** A group of properties that deliberately does NOT cross over into Figma. */
export interface TokenExclusion {
  /** Anchored regex source matched against the full `--*` property name. */
  readonly match: string;
  /** Why it cannot or should not be a Figma variable. Required — an unexplained
   *  exclusion is indistinguishable from an oversight. */
  readonly reason: string;
}

/** A complete contract: what to map, what to skip, and the root font size the
 *  `rem` values resolve against. */
export interface TokenContract {
  readonly name: string;
  /** `rem` → px divisor, since Figma variables are unitless numbers meaning px. */
  readonly rootFontSize: number;
  readonly rules: readonly TokenRule[];
  readonly exclusions: readonly TokenExclusion[];
}

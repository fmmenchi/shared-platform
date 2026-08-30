/**
 * VALIDATING A THEME — what "allowed" means, as types.
 *
 * `ThemeViolation` was declared inline in `validate.ts`; it lives here because
 * every other type in this package does, and because the solver in ADR-0033
 * needs to read the same vocabulary the validator writes.
 *
 * The policy these describe is the one this repo already runs: WCAG AA is the
 * hard gate (4.5 for text, 3 for rings and non-text), and an APCA floor of
 * |Lc| >= 45 is ALSO hard, with |Lc| < 60 reported as advisory rather than
 * failed. That second half currently lives in `tokens.test.ts` instead of in
 * `validateTheme()`, which means the pipeline demands more than the public
 * verdict does — a generated theme can pass the builder and fail CI. These
 * types are the shape that lets the floor move where it belongs.
 */
import type { ColorRole } from './tokens.types.js';

/** Why a theme was refused. */
export type ViolationKind =
  | 'missing-role'
  | 'unknown-role'
  | 'unparsable-color'
  | 'out-of-gamut'
  | 'contrast'
  | 'apca'
  | 'state-ramp'
  | 'indistinct-disabled';

export interface ThemeViolation {
  kind: ViolationKind;
  role?: string;
  pair?: readonly [string, string];
  /** WCAG ratio measured, on a `contrast` violation. */
  ratio?: number;
  /** WCAG ratio required, on a `contrast` violation. */
  minimum?: number;
  /** APCA lightness contrast measured, absolute, on an `apca` violation. */
  lc?: number;
  /** APCA floor required, on an `apca` violation. */
  lcFloor?: number;
  message: string;
}

/**
 * A pair that clears both hard floors but sits under the APCA body-text
 * guideline. Reported, never failed: |Lc| 60 is guidance for body copy, and the
 * smallest text in this system is a medium-weight button label.
 */
export interface ThemeAdvisory {
  pair: readonly [ColorRole, ColorRole];
  lc: number;
  guideline: number;
  message: string;
}

/**
 * What one role must satisfy, and where a solver looks for it.
 *
 * TWO metrics, not one. A single WCAG `floor` would let a solver satisfy the
 * public verdict and still produce a theme this repo's own gate rejects,
 * because the gate also enforces APCA. Carrying both is what makes "the wizard
 * and CI ask the same question" true rather than aspirational.
 */
/**
 * HOW a role gets its value — five kinds, because the shipped palette uses five.
 *
 * A single `direction` could not say this. Read off `primary` in the base theme:
 * the fill is 700, `-hover` 800 and `-active` 900, `-subtle` 100, and
 * `-subtle-foreground` 800 — while `-foreground` is `neutral-0`, not a rung of
 * the family at all. An ink is chosen from the theme's two neutrals; a state is
 * a fixed distance from the fill; a wash is the far end; and a wash's text is
 * searched for. Flattening those into one field would have made the solver guess
 * which was meant.
 */
export type Placement =
  /** The fill: taken from the brand colour's lightness, not searched for. */
  | { readonly kind: 'anchor' }
  /** Whichever of the theme's two inks clears the floor on its background. */
  | { readonly kind: 'ink' }
  /** A fixed number of rungs from another role, in the scheme's direction. */
  | { readonly kind: 'offset'; readonly from: string; readonly rungs: number }
  /** The nearest rung, walking that way, that satisfies the floors. */
  | { readonly kind: 'search'; readonly toward: 'ink' | 'surface' }
  /** Placed, but under no floor: WCAG 1.4.3 exempts disabled controls. */
  | { readonly kind: 'exempt'; readonly toward: 'ink' | 'surface' };

/** One pair a role must clear. */
export interface Floor {
  readonly against: ColorRole;
  /** WCAG ratio required. */
  readonly ratio: number;
  /** APCA |Lc| required, or `null` on a non-text pair — APCA judges reading. */
  readonly lc: number | null;
}

export interface Constraint {
  readonly role: ColorRole;
  /**
   * EVERY pair this role must clear, not one.
   *
   * A role is routinely under several: `primary` is a non-text indicator owing
   * 3:1 against `background`, against `muted` AND against `primary-subtle`
   * (WCAG 1.4.11). Carrying a single `against` let a solver satisfy the first and
   * silently break the others — which is what an earlier version of this type
   * did, until a test asked what `primary` was measured against and got one
   * answer where the contract declares three.
   *
   * Empty where nothing is measured: a disabled pair, or a role that only ever
   * appears as a background.
   */
  readonly floors: readonly Floor[];
  readonly placement: Placement;
}

/**
 * A role no rung could satisfy.
 *
 * A field rather than a thrown error, deliberately: the requirement that a
 * solver SAY SO instead of returning a least-bad candidate is only enforceable
 * if there is somewhere for it to say it. `best` is what the closest rung
 * managed, so a builder can report how far off it was instead of only that it
 * failed.
 */
export interface Unsatisfied {
  readonly role: ColorRole;
  readonly against: ColorRole;
  readonly ratio: number | null;
  readonly lc: number | null;
  readonly best: {
    readonly step: number;
    readonly ratio: number;
    readonly lc: number;
  };
}

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
export interface Constraint {
  readonly role: ColorRole;
  readonly against: ColorRole;
  /** WCAG ratio required, or `null` where 1.4.3 exempts the pair. */
  readonly ratio: number | null;
  /** APCA |Lc| required. `null` wherever `ratio` is, and for non-text pairs. */
  readonly lc: number | null;
  /**
   * Which way a solver walks the ramp looking for a rung that satisfies this.
   * `anchor` is the fill: a choice taken from the brand colour, not a search.
   */
  readonly direction: 'anchor' | 'toward-ink' | 'toward-surface';
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

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
/**
 * Every `--fm-*` declaration a stylesheet makes: the name exactly as written, and
 * its value unresolved — `var(--fm-palette-primary-700)` stays that, because a
 * reader needs to see the reference before deciding what to do with it.
 *
 * IT HAS A NAME BECAUSE `ReadonlyMap<string, string>` HAS NONE. Three functions
 * here take one, and spelled as a bare map the signature tells a caller nothing:
 * not which stylesheet, not that `parseTheme` is where one comes from, and not that
 * handing over half of a cascade (a dark preset alone, say) produces a wrong answer
 * rather than an error. The type is the only place that can say so.
 */
export type Declarations = ReadonlyMap<string, string>;

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
export interface ContrastAdvisory {
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

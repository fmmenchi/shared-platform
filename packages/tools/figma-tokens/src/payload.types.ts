/**
 * The OUTPUT shape — what a contract becomes once resolved against a
 * stylesheet. This is the payload a Figma plugin script consumes.
 */
import type { FigmaVariableType } from './contract.types.js';

/** sRGB channels in Figma's 0–1 range, the only colour shape the Plugin API takes. */
export interface FigmaRgba {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

/** One resolved variable, ready to be written into a Figma collection. */
export interface FigmaVariable {
  /** The `--*` property it mirrors. Written into the Figma variable's
   *  description, which is what makes the mapping reversible from Figma alone. */
  readonly cssVar: string;
  /** `/`-separated Figma variable path. */
  readonly path: string;
  readonly type: FigmaVariableType;
  /** The declared CSS value, kept for diagnostics and for the docs table. */
  readonly css: string;
  readonly value: FigmaRgba | number;
  readonly scopes: readonly string[];
  /**
   * The declared colour lies outside sRGB and was clipped to fit. Figma has no
   * wide-gamut variable, so the clip is unavoidable — but it is a real
   * divergence from what the browser paints, and it is reported, never silent.
   */
  readonly clipped?: boolean;
}

/** A property the contract deliberately leaves behind, with the reason. */
export interface SkippedToken {
  readonly cssVar: string;
  readonly css: string;
  readonly reason: string;
}

/**
 * The resolution result. `problems` is the load-bearing field: a property that
 * matches no rule and no exclusion lands there, so a token added to the
 * stylesheet without a decision about Figma cannot pass unnoticed.
 */
export interface FigmaTokenPayload {
  readonly contract: string;
  readonly variables: readonly FigmaVariable[];
  readonly skipped: readonly SkippedToken[];
  readonly problems: readonly string[];
}

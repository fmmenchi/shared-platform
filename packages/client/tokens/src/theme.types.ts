/**
 * DECLARING A THEME — the model a theme is built from and resolved into.
 *
 * `tokens.types.ts` says what a FINISHED theme is: `ThemeColors`, every role
 * assigned a colour. That is the contract a consumer ships and CI checks. It
 * says nothing about how those colours were arrived at, which is fine for
 * validating a theme and useless for building one: a generator needs to know
 * which rungs exist, which role may point where, and why each pointer was
 * chosen.
 *
 * Three nouns, and keeping them apart is the whole design (ADR-0033):
 *
 * - `DesignSystem` — the SHAPE of a palette. Not ours: the rungs, the families
 *   and the constraints as data, so the arithmetic knows nothing about seven
 *   families or the names we happen to use, and can be tested against a
 *   synthetic system of three rungs and two roles.
 * - `ThemeSpec` — what a theme ASKS FOR. Brand colours, the roles a person
 *   pinned, the strategy. It is also the theme builder's form state, which is
 *   why it holds only what a person can change.
 * - `Theme` — the RESOLVED result, carrying its reasons. Every assignment says
 *   whether it was chosen, solved or pinned, and what was measured to justify
 *   it, because a preset you cannot interrogate is one you cannot maintain.
 *
 * Every name-set here is DERIVED from the `as const` arrays in `./tokens.ts`,
 * the same discipline `tokens.types.ts` follows: the runtime lists and the
 * compile-time shapes cannot drift.
 */
import type {
  COLOR_SCHEMES,
  PALETTE_FAMILIES,
  REFERENCE_PRESETS,
} from './tokens.js';
import type { ColorRole } from './tokens.types.js';
import type { Unsatisfied } from './validate.types.js';

/**
 * `base` is the `:root` scheme; `dark` is the `[data-theme='dark']` one.
 *
 * NOT `light` and `dark`. `base` names a position in the cascade, not a
 * lightness, and the two are not the same claim: a consumer is free to put a
 * dark palette on `:root`, at which point a scheme called `light` would be
 * lying about the theme it holds. The code already agrees — `validateTheme()`
 * derives a theme's polarity by MEASURING the background's lightness rather
 * than reading the preset's name — so naming the scheme `light` would copy that
 * fact into a second place, where it can be wrong.
 */
export type Scheme = (typeof COLOR_SCHEMES)[number];

/**
 * A scheme is currently also a reference preset. This alias is never used at a
 * value position — it exists so that a reference preset which is NOT a scheme
 * makes the assignment below fail to compile, instead of the two lists quietly
 * meaning different things.
 */
type SchemesAreReferencePresets =
  Scheme extends (typeof REFERENCE_PRESETS)[number] ? true : never;
/** @internal Compile-time only. */
export type SchemeCheck = SchemesAreReferencePresets;

/** One of the seven families a ramp is generated for. */
export type PaletteFamily = (typeof PALETTE_FAMILIES)[number];

/** Per-scheme values, for the axes a theme has two of. */
export type PerScheme<T> = Readonly<Record<Scheme, T>>;

// ---------------------------------------------------------------------------
// The SHAPE of a design system
// ---------------------------------------------------------------------------

/**
 * One rung of a ramp.
 *
 * `lightness` is ABSOLUTE rather than an offset from the base, which is a
 * decision the type is stating rather than a detail it is describing: measured
 * across 648 bases, an offset-anchored ramp's guaranteeing contrast distance
 * moves with the base (6 rungs or 7, depending) while an absolutely anchored
 * one does not. Hue and chroma still come from the base, so a brand keeps its
 * colour; only where each rung SITS is fixed.
 */
export interface Rung {
  /** Its name in the token surface: `700` in `--fm-palette-primary-700`. */
  readonly step: number;
  /** OKLCH lightness, 0–1. */
  readonly lightness: number;
  /** How much of the base's chroma this rung keeps, 0–1. */
  readonly chromaFactor: number;
}

/** A scheme's ramp: ordered lightest to darkest, `step` unique within it. */
export type Ramp = readonly Rung[];

/**
 * The design system as data — what a solver is TOLD, never what it makes.
 *
 * `ramps` is per scheme and shared by every family, which is what the shipped
 * palette does today. A system whose families each had their own ramp would
 * widen this field rather than change anything that reads it.
 */
export interface DesignSystem {
  readonly families: readonly PaletteFamily[];
  readonly ramps: PerScheme<Ramp>;
  /** The two inks a fill may carry: the neutral scale's ends, per scheme. */
  readonly inks: PerScheme<readonly [lighter: string, darker: string]>;
}

// ---------------------------------------------------------------------------
// What a theme ASKS FOR
// ---------------------------------------------------------------------------

/**
 * How the rungs of a ramp are generated.
 *
 * `constant-step` places them at fixed lightness intervals and is the one that
 * exists. `constant-contrast` would define each rung by the ratio it must clear
 * — the Adobe Leonardo model — and is named here rather than built, so the
 * wizard can offer one option honestly instead of a disabled control implying a
 * feature that is absent.
 */
export type RampStrategy = 'constant-step' | 'constant-contrast';

/**
 * What a person asks for — and, unchanged, the theme builder's form state.
 *
 * Its three fields are the whole of what anyone can change, which gives the
 * wizard a real test: a control that cannot be expressed as a change to a
 * `ThemeSpec` does not belong in it.
 */
export interface ThemeSpec {
  /** One CSS colour per family. Hue and chroma are read from these. */
  readonly brand: Partial<Record<PaletteFamily, string>>;
  /**
   * Roles pinned to a rung, per scheme, overriding what the solver would pick.
   * Per scheme because the ramps do not share step names — 9 rungs against 13 —
   * so a pin means nothing without saying which scheme it belongs to.
   */
  readonly pins?: PerScheme<Partial<Record<ColorRole, number>>>;
  readonly strategy?: RampStrategy;
}

// ---------------------------------------------------------------------------
// The RESOLVED theme, with its reasons
// ---------------------------------------------------------------------------

/** A family's seed: what a brand actually contributes. */
export interface Base {
  /** OKLCH hue in degrees. Hueless greys have none. */
  readonly hue: number | undefined;
  readonly chroma: number;
  readonly lightness: number;
}

/** One resolved colour of a ramp. */
export interface Swatch {
  readonly step: number;
  /** What gets declared, and what contrast was measured on. */
  readonly css: string;
  readonly lightness: number;
  readonly chroma: number;
  /**
   * True where the sRGB gamut, not the curve, decided the chroma. Worth
   * carrying: a clamped rung is one whose contrast was set by the boundary, and
   * that is what made `secondary` collide with `primary` when both were pushed
   * to the limit of the same hue.
   */
  readonly clamped: boolean;
}

export interface FamilyPalette {
  readonly family: PaletteFamily;
  readonly base: Base;
  readonly swatches: readonly Swatch[];
}

/** Levels 1 and 2 of the token architecture, resolved for one scheme. */
export interface Palette {
  readonly scheme: Scheme;
  readonly families: readonly FamilyPalette[];
}

/** Why an assignment holds: the pair that was measured and what it scored. */
export interface AssignmentEvidence {
  readonly against: ColorRole;
  /** WCAG ratio measured. */
  readonly ratio: number;
  /** APCA lightness contrast measured, absolute. */
  readonly lc: number;
}

/**
 * How one role got its value.
 *
 * `chosen` is the fill — the single free decision per family, taken from the
 * brand colour's lightness. `solved` met its constraint by search. `pinned` is
 * a person overriding either. The distinction is what the wizard's form shows,
 * and what lets a spec be recovered from generated CSS.
 */
export type AssignmentOrigin = 'chosen' | 'solved' | 'pinned';

export interface Assignment {
  readonly role: ColorRole;
  readonly family: PaletteFamily;
  readonly step: number;
  readonly origin: AssignmentOrigin;
  /** `null` only where the pair is exempt and nothing was required. */
  readonly evidence: AssignmentEvidence | null;
}

/**
 * One scheme of a theme, resolved.
 *
 * `unsatisfied` being a field and not an exception is the point: a theme whose
 * constraints could not all be met is still a `Theme` — it still renders, still
 * exports, and still says exactly what is wrong. Refusing to produce one would
 * only teach people to route around the tool.
 */
export interface Theme {
  readonly scheme: Scheme;
  readonly palette: Palette;
  readonly assignments: readonly Assignment[];
  readonly unsatisfied: readonly Unsatisfied[];
}

/** Both schemes from one set of colours, plus the spec that produced them. */
export interface Preset {
  readonly name: string;
  readonly schemes: PerScheme<Theme>;
  readonly spec: ThemeSpec;
}

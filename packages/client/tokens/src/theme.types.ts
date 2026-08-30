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
import type { PALETTE_FAMILIES } from './tokens.js';
import type { ColorRole, ColorScheme } from './tokens.types.js';
import type { Unsatisfied } from './validate.types.js';

/** One of the seven families a ramp is generated for. */
export type PaletteFamily = (typeof PALETTE_FAMILIES)[number];

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

/** A theme's ramp: ordered lightest to darkest, `step` unique within it. */
export type Ramp = readonly Rung[];

/**
 * One rung of the grey scale: an ABSOLUTE colour, not derived from a base.
 *
 * A different kind of thing from a `Rung`, which is why it is a different type.
 * A family's rung takes hue and chroma from a brand colour and only fixes where
 * it sits; a grey has no brand to take them from, so it carries its own value.
 */
export interface NeutralRung {
  readonly step: number;
  /** The colour itself, e.g. `oklch(95% 0.007 256)`. */
  readonly css: string;
}

/**
 * The grey scale — shared by every theme, and not a brand's to change.
 *
 * System-wide rather than per theme, which the shipped files settle rather than
 * assume: `vars.css` declares 36 of these and `presets/dark.css` declares NONE,
 * referencing them instead. It sits here because it is what `ThemeDefinition.inks`
 * point into, and because every family measures its foreground against its ends.
 */
export type NeutralScale = readonly NeutralRung[];

/**
 * One theme a system can build: where it applies, what it claims to be, and the
 * ramp its rungs come from.
 *
 * A THEME IS A THEME. `dark` is not an axis with two values, it is a second
 * entry here — a different selector and a ramp of its own (thirteen rungs where
 * the base has nine). Nothing in the mechanism is special about it, so a third
 * theme (a high-contrast variant, a second brand) is another entry rather than a
 * type change. That is also why `colorScheme` is a FIELD: light and dark are
 * genuinely two values, but of the CSS property a theme declares, not of the
 * theme itself.
 */
export interface ThemeDefinition {
  /** How a spec and a set of pins refer to it. */
  readonly name: string;
  /** How it is selected in CSS: `:root`, `[data-theme='dark']`, … */
  readonly selector: string;
  /** What it tells the browser it is, so native controls are painted to match. */
  readonly colorScheme: ColorScheme;
  readonly ramp: Ramp;
  /**
   * The two inks a fill may carry, as STEPS of `DesignSystem.neutral` — not CSS
   * strings. A string here would be a reference into a scale this type never
   * declares, so a typo or a retired rung would only surface as an unreadable
   * button; a step is resolvable, which makes it checkable.
   *
   * Two because a solver picks between them by measurement, and they differ per
   * theme: the base theme inks its fills with pure white (step 0) while the dark
   * theme uses an off-white (step 50), which is what the shipped presets do.
   */
  readonly inks: readonly [lighter: number, darker: number];
}

/**
 * The design system as data — what a solver is TOLD, never what it makes.
 *
 * One ramp per theme, shared by every family, which is what the shipped palette
 * does. A system whose families each had their own ramp would widen
 * `ThemeDefinition` rather than change anything that reads this.
 */
export interface DesignSystem {
  /**
   * System-wide, not per theme: both shipped presets define exactly these seven
   * and every theme must assign all of them, which is what completeness means.
   * Putting them on a theme would duplicate a fact that provably does not vary.
   */
  readonly families: readonly PaletteFamily[];
  /** Shared and fixed. What `ThemeDefinition.inks` index into. */
  readonly neutral: NeutralScale;
  /** What DOES vary per theme: the ramp its rungs sit on, and its inks. */
  readonly themes: readonly ThemeDefinition[];
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
   * Roles pinned to a rung, keyed by `ThemeDefinition.name`, overriding what
   * the solver would pick. Keyed per theme because ramps do not share step
   * names — nine rungs against thirteen — so a pin means nothing without saying
   * which theme it belongs to.
   */
  readonly pins?: Readonly<Record<string, Partial<Record<ColorRole, number>>>>;
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

/** Levels 1 and 2 of the token architecture, resolved for one theme. */
export interface Palette {
  readonly theme: string;
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
  readonly definition: ThemeDefinition;
  readonly palette: Palette;
  readonly assignments: readonly Assignment[];
  readonly unsatisfied: readonly Unsatisfied[];
}

/**
 * Every theme built from one set of colours, plus the spec that produced them.
 *
 * A list, not a light/dark pair: the brand's hues do not change between themes,
 * only the ramp they are placed on does, so one spec yields as many themes as
 * the design system defines.
 */
export interface Preset {
  readonly name: string;
  readonly themes: readonly Theme[];
  readonly spec: ThemeSpec;
}

/**
 * DECLARING A THEME — the model a theme is built from (ADR-0033).
 *
 * `tokens.types.ts` says what a FINISHED theme is: `ThemeColors`, every role
 * assigned. That is enough to validate one and useless to build one, which needs
 * to know which rungs exist and what a person actually chose.
 *
 * Two nouns, kept apart:
 *
 * - `DesignSystem` — the SHAPE of a palette, as data, so the arithmetic knows
 *   nothing about seven families or our names. Derived from the installed
 *   stylesheet by `describeSystem()`; never authored.
 * - `ThemeSpec` — what a theme ASKS FOR, and unchanged the theme builder's
 *   editable form. It holds only what a person can change.
 *
 * The resolved output — the palette, the assignments and their reasons — is NOT
 * here. It lived here before `buildPreset()` existed to produce it and nothing
 * consumed it, while every type below that real code touched, real code
 * corrected. It comes back shaped by the function that returns it.
 */
import type { PALETTE_FAMILIES } from '@fmmenchi/tokens';
import type { ColorRole } from '@fmmenchi/tokens';

/** One of the seven families a ramp is generated for. */
export type PaletteFamily = (typeof PALETTE_FAMILIES)[number];

/**
 * Which scale a value is taken from. Both, because the shipped roles use both:
 * `ring` is `primary-600` while `background` is `neutral-15`.
 */
export type PaletteSource = PaletteFamily | 'neutral';

// ---------------------------------------------------------------------------
// The shape of a design system
// ---------------------------------------------------------------------------

/**
 * One rung of a ramp.
 *
 * `lightness` is ABSOLUTE, not an offset, which states a decision: measured
 * across 648 bases, an offset-anchored ramp's guaranteeing contrast distance
 * moves with the base (6 rungs or 7) while an absolutely anchored one does not.
 * Hue and chroma still come from the base, so a brand keeps its colour.
 */
export interface Rung {
  /** Its name in the token surface: `700` in `--fm-palette-primary-700`. */
  readonly step: number;
  /** OKLCH lightness, 0–1. */
  readonly lightness: number;
  /** How much of the base's chroma this rung keeps, 0–1. */
  readonly chromaFactor: number;
}

/** A ramp: ordered lightest to darkest, `step` unique within it. */
export type Ramp = readonly Rung[];

/** A family's seed — what a brand contributes. */
export interface Base {
  /** OKLCH hue in degrees. Hueless greys have none. */
  readonly hue: number | undefined;
  readonly chroma: number;
  readonly lightness: number;
}

/**
 * The grey scale: a base the SYSTEM owns, on the same kind of ramp as a family.
 *
 * No second rung type, because everything derives from a base — only the owner
 * differs, and being ours is why a brand cannot move it. The shipped scale fits:
 * hue 256, chroma rising to a plateau of 0.02, and the achromatic endpoints are
 * simply `chromaFactor: 0`.
 */
export interface NeutralDefinition {
  readonly base: Base;
  readonly ramp: Ramp;
}

/**
 * One theme a system can build.
 *
 * A THEME IS A THEME: `dark` is not an axis, it is a second entry with its own
 * selector and its own ramp — thirteen rungs where the base has nine. A third, a
 * high-contrast variant or a second brand, is another entry and not a type
 * change. `colorScheme` is a field because light and dark are two values of the
 * CSS property a theme declares, not of the theme itself.
 */
export interface ThemeDefinition {
  /** How a spec and its pins refer to it. */
  readonly name: string;
  /** How it is selected in CSS: `:root`, `[data-theme='dark']`, … */
  readonly selector: string;
  readonly colorScheme: 'light' | 'dark';
  /**
   * One ramp PER FAMILY, not one shared by all.
   *
   * Measured, and the assumption was wrong: the shipped bases sit at L 0.54–0.60
   * and rungs are offsets from their base, so `warning` runs 0.95–0.46 where
   * `accent` runs 0.89–0.40. Under absolute anchoring these converge — a
   * property to check once it lands, not an invariant to encode before it does.
   */
  readonly ramps: Readonly<Record<PaletteFamily, Ramp>>;
  /**
   * The two inks a fill may carry, as STEPS of the neutral ramp. Steps and not
   * CSS strings because a solver has to MEASURE an ink, and a `var()` reaches
   * the stylesheet without ever revealing what it holds.
   */
  readonly inks: readonly [lighter: number, darker: number];
}

/**
 * The design system as data — what a solver is TOLD, never what it makes.
 *
 * @example A synthetic system. The shape is the point; a copy of the shipped
 * ramp in a comment is a copy that can rot. A real one has seven families, 36
 * greys and two themes, and comes from `describeSystem()`.
 * ```ts
 * const ramp: Ramp = [{ step: 500, lightness: 0.55, chromaFactor: 1 }];
 * const everyFamily = Object.fromEntries(
 *   PALETTE_FAMILIES.map((f) => [f, ramp]),
 * ) as ThemeDefinition['ramps'];
 *
 * const tiny: DesignSystem = {
 *   neutral: {
 *     base: { hue: 256, chroma: 0.02, lightness: 0.6 },
 *     ramp: [
 *       { step: 0, lightness: 1, chromaFactor: 0 },
 *       { step: 1000, lightness: 0, chromaFactor: 0 },
 *     ],
 *   },
 *   themes: [
 *     {
 *       name: 'base',
 *       selector: ':root',
 *       colorScheme: 'light',
 *       ramps: everyFamily,
 *       inks: [0, 1000],
 *     },
 *   ],
 * };
 * ```
 */
export interface DesignSystem {
  /*
   * There is no `families` list. It would restate the keys of every theme's
   * `ramps`, and two statements of one fact can disagree — which the synthetic
   * example below demonstrated by declaring one family and seven ramps.
   */
  /**
   * Shared and fixed — not a brand's to change, and in the wizard context rather
   * than a control. `vars.css` declares 36 rungs; `dark.css` declares none.
   */
  readonly neutral: NeutralDefinition;
  readonly themes: readonly ThemeDefinition[];
}

// ---------------------------------------------------------------------------
// What a theme asks for
// ---------------------------------------------------------------------------

/**
 * How the rungs of a ramp are generated. `constant-step` is the one that exists;
 * `constant-contrast` (the Leonardo model) is named rather than built, so the
 * wizard offers one option honestly instead of a disabled control.
 */
export type RampStrategy = 'constant-step' | 'constant-contrast';

/** Which rung a hand-written colour replaces: `primary-300`. */
export type RungKey = `${PaletteFamily}-${number}`;

/**
 * A semantic role pointed at a value of the palette by hand.
 *
 * Carries a SOURCE, not just a step: a role is not confined to its own family,
 * and someone choosing a value is choosing from the whole palette.
 */
export interface RolePin {
  readonly source: PaletteSource;
  readonly step: number;
  /** 0–1. Always present, 1 meaning opaque; `scrim` is `neutral-850` at 0.92. */
  readonly alpha: number;
}

/**
 * What a person asks for — and, unchanged, the theme builder's editable form.
 *
 * Every field is present: a form has a value in every control, so "unset" and
 * "cleared" cannot be the same state. `pins` and `swatches` reset by REMOVAL,
 * absence being what "accepted as proposed" means, while `brand` resets by
 * re-seeding from the installed system's own base.
 *
 * It holds what a person changes about THE THEME. Which theme they are looking
 * at, whether the preview is docked, which step is open: view state, not here.
 *
 * @example One of each kind of edit.
 * ```ts
 * const acme: ThemeSpec = {
 *   name: 'acme',
 *   strategy: 'constant-step',
 *   brand: {
 *     primary: '#FF5A5F',
 *     secondary: '#FC642D',
 *     accent: '#00A699',
 *     negative: 'oklch(57% 0.1823 27)',
 *     success: 'oklch(55% 0.1167 150)',
 *     warning: 'oklch(60% 0.099 78)',
 *     info: 'oklch(56% 0.1094 245)',
 *   },
 *   // A rung rejected. Empty is the normal case.
 *   swatches: { base: { 'primary-300': 'oklch(70% 0.16 22)' } },
 *   pins: {
 *     base: {
 *       // The fill was fine, its ink was not — so only the ink moved.
 *       'primary-foreground': { source: 'neutral', step: 760, alpha: 1 },
 *       scrim: { source: 'neutral', step: 850, alpha: 0.92 },
 *     },
 *     // Its own step numbers: 900 is mid-ramp in thirteen rungs.
 *     dark: { link: { source: 'primary', step: 900, alpha: 1 } },
 *   },
 * };
 * ```
 */
export interface ThemeSpec {
  /** Editable, and the only place the name is held. */
  readonly name: string;
  /** One CSS colour per family; hue and chroma are read from these. */
  readonly brand: Record<PaletteFamily, string>;
  /**
   * Roles pinned by hand, keyed by theme name then role. Keyed by theme because
   * ramps do not share step names — nine rungs against thirteen.
   */
  readonly pins: Readonly<Record<string, Partial<Record<ColorRole, RolePin>>>>;
  /** Rungs written by hand, keyed by theme name then rung. */
  readonly swatches: Readonly<Record<string, Partial<Record<RungKey, string>>>>;
  readonly strategy: RampStrategy;
}

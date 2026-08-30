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

/**
 * Which scale a value is taken from: one of the seven families, or the shared
 * grey scale.
 *
 * Both, because the shipped roles use both freely — `ring` is `primary-600` and
 * `link` is `primary-700`, while `background` is `neutral-15`, `card` is
 * `neutral-0` and `border` is `neutral-90`. A type that only allowed a family
 * could not express half the surface roles.
 */
export type PaletteSource = PaletteFamily | 'neutral';

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
 *
 * @example A synthetic system — two families, three rungs — deliberately not ours,
 * since a copy of the shipped ramp in a comment is a copy that can rot:
 * ```ts
 * const tiny: DesignSystem = {
 *   families: ['primary', 'negative'],
 *   neutral: [
 *     { step: 0, css: 'oklch(100% 0 0)' },
 *     { step: 500, css: 'oklch(60% 0.01 256)' },
 *     { step: 900, css: 'oklch(20% 0.01 256)' },
 *   ],
 *   themes: [
 *     {
 *       name: 'base',
 *       selector: ':root',
 *       colorScheme: 'light',
 *       ramp: [
 *         { step: 100, lightness: 0.9, chromaFactor: 0.22 },
 *         { step: 500, lightness: 0.55, chromaFactor: 1 },
 *         { step: 900, lightness: 0.22, chromaFactor: 0.5 },
 *       ],
 *       inks: [0, 900],
 *     },
 *   ],
 * };
 * ```
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
 * Which rung a hand-written colour replaces: `primary-300`, the same name the
 * palette variable carries.
 *
 * A template key rather than a third level of nesting, so an override is one
 * assignment for a form and cannot be duplicated.
 */
export type RungKey = `${PaletteFamily}-${number}`;

/**
 * A semantic role pointed at a value of the palette by hand.
 *
 * Carries a SOURCE and not just a step, because a role is not confined to its
 * own family: `ring` draws from `primary`, `background` from `neutral`, and a
 * person choosing a value for a role is choosing from the whole palette.
 *
 * The theme and the role are the KEY rather than fields, because this has to map
 * onto a form. A list would let two pins disagree about the same role — a state
 * that is representable and invalid, which is the kind a form generates by
 * accident — and would make a control find-and-splice where it should assign.
 */
export interface RolePin {
  readonly source: PaletteSource;
  readonly step: number;
  /**
   * Opacity, 0–1, where a role is a translucent rung — `scrim` is `neutral-850`
   * at 0.92. Always present, 1 meaning opaque, so there is no absent state to
   * confuse with a cleared one.
   */
  readonly alpha: number;
}

/**
 * What a person asks for — and, unchanged, the theme builder's EDITABLE FORM.
 *
 * Not a model that mirrors the form: the form's state is a value of this type,
 * which is why every field is plain, serialisable data. That is also what makes
 * the round trip possible — `ThemeSpec` → `buildPreset()` → emitted CSS →
 * `ThemeSpec` read back — since a role in that CSS is a reference to a rung and
 * a base is a literal, so nothing a person chose is lost on the way out.
 *
 * RESETTING falls out of the shape, and asymmetrically, which is worth knowing
 * before writing the controls. `pins` and `swatches` reset by REMOVAL — delete a
 * key and the derivation is back in charge, because absence is exactly what "as
 * proposed" means. That works at every granularity a form needs: one role or one
 * rung by deleting its key, a whole theme's edits by deleting the theme's, all of
 * it by emptying the record. `brand` cannot reset that way, because it is total
 * and a colour is never absent: resetting a family means RE-SEEDING it from the
 * installed `DesignSystem`'s own base, the same value the wizard started from.
 *
 * It holds what a person changes about THE THEME, and deliberately nothing about
 * how they are looking at it. Which theme the preview is showing, whether the
 * preview is docked, which step is open: all view state, none of it here. A
 * theme is not different because somebody scrolled.
 *
 * @example Three brand colours changed, one rung rejected, three roles pointed by
 * hand — one of each kind of edit this type allows:
 * ```ts
 * const acme: ThemeSpec = {
 *   name: 'acme',
 *   strategy: 'constant-step',
 *   // Total: the wizard seeded all seven, the person changed three.
 *   brand: {
 *     primary: '#FF5A5F',
 *     secondary: '#FC642D',
 *     accent: '#00A699',
 *     negative: 'oklch(57% 0.1823 27)',
 *     success: 'oklch(55% 0.1167 150)',
 *     warning: 'oklch(60% 0.099 78)',
 *     info: 'oklch(56% 0.1094 245)',
 *   },
 *   // Empty is the normal case. Delete the key to go back to the proposal.
 *   swatches: { base: { 'primary-300': 'oklch(70% 0.16 22)' } },
 *   pins: {
 *     base: {
 *       // The fill was fine, its ink was not — so only the ink moved.
 *       'primary-foreground': { source: 'neutral', step: 760, alpha: 1 },
 *       // A surface role drawing from a brand family.
 *       link: { source: 'primary', step: 700, alpha: 1 },
 *       // The one role that needs an alpha.
 *       scrim: { source: 'neutral', step: 850, alpha: 0.92 },
 *     },
 *     // Another theme, its own step numbers: 900 is mid-ramp in thirteen rungs.
 *     dark: { link: { source: 'primary', step: 900, alpha: 1 } },
 *   },
 * };
 * ```
 */
export interface ThemeSpec {
  /** What the theme is called. Editable, and the only place it is held. */
  readonly name: string;
  /**
   * One CSS colour per family; hue and chroma are read from these.
   *
   * TOTAL, not partial. A form has a value in every control, so the spec has one
   * for every family: the builder seeds them from the installed
   * `DesignSystem`'s own bases — which is what `--tokens` is for — and a family
   * nobody touches simply carries the value it already had. An optional field
   * would have made "unset" and "cleared" the same state, and the emitted CSS
   * declares all seven bases regardless, so partiality bought nothing and cost
   * the round trip its exactness.
   */
  readonly brand: Record<PaletteFamily, string>;
  /**
   * Semantic roles pointed at a value of the palette by hand, keyed by
   * `ThemeDefinition.name` then by role, overriding what the solver would pick.
   * Empty where the solution was accepted.
   *
   * Keyed by theme because ramps do not share step names — nine rungs against
   * thirteen — so a step means nothing without saying which theme it belongs to.
   * `string` rather than a union of our theme names, so a system defining a third
   * theme needs no change here; the keys are validated against
   * `DesignSystem.themes` where a spec is applied, the only place that knows them.
   */
  readonly pins: Readonly<Record<string, Partial<Record<ColorRole, RolePin>>>>;
  /**
   * Rungs written by hand, keyed by `ThemeDefinition.name` then by rung. Empty
   * when the derivation was accepted as proposed, which is the common case and
   * the whole point of deriving.
   *
   * Two consequences worth knowing before using one. An overridden rung stops
   * following its base — the family moves around it when the brand colour
   * changes — so it is a value maintained by hand from then on. And it can break
   * a pair that used to pass, which is why the verdict still runs over the
   * result rather than trusting the derivation that produced most of it.
   */
  readonly swatches: Readonly<Record<string, Partial<Record<RungKey, string>>>>;
  /** Present because the form has a control for it; there is no absent state. */
  readonly strategy: RampStrategy;
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

/**
 * One resolved colour of a ramp — computed to be MEASURED, not to be rendered.
 *
 * The app resolves the theme at runtime: the CSS declares the seven bases, and
 * the browser derives every rung from them through relative colour, so changing
 * a base moves its whole family with no rung rewritten. Nothing here is shipped
 * in place of that. These values exist because contrast cannot be measured
 * without them, and a solver that guessed at what the browser would compute
 * would be asserting its own arithmetic.
 */
export interface Swatch {
  readonly step: number;
  /** The colour the browser will resolve, and what contrast was measured on. */
  readonly css: string;
  /**
   * Whether this rung was derived from the base or written by hand.
   *
   * Recoverable from the emitted CSS without any metadata, which is why the
   * round trip works: a derived rung is declared as a relative colour
   * (`oklch(from var(--…-base) …)`) and an overridden one as a plain literal, so
   * the form of the declaration IS the answer.
   */
  readonly origin: 'derived' | 'overridden';
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

/**
 * Levels 1 and 2 of the token architecture, resolved for one theme — and the
 * DERIVED shape that shows the scale.
 *
 * Strictly output: nothing here is authored, every value is computed from a
 * `ThemeSpec` and a `ThemeDefinition`. That separation is the point. An input a
 * person edits and an output a solver produces are different kinds of data, and
 * one structure serving both would make it impossible to say which of two
 * disagreeing values a person actually chose.
 */
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
  /**
   * `PaletteSource`, not `PaletteFamily`: a role may point at the grey scale,
   * and most surface roles do. Typing this as a family made `background`, `card`
   * and `border` unrepresentable.
   */
  readonly source: PaletteSource;
  readonly step: number;
  /** 1 unless the role is a translucent rung. */
  readonly alpha: number;
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
 * THIS IS THE WHOLE MATRIX — derived, with the spec's edits applied. Every rung
 * of every family and every one of the 84 roles, resolved, each carrying whether
 * it was derived or overridden and what was measured. `buildPreset()` returns it
 * on demand from seven colours and a handful of edits.
 *
 * Which is the entire point of not storing it: the matrix is an OUTPUT, not a
 * record. Persisting it would make a rebrand rewrite 168 declarations — 14 bases
 * and 154 rungs, exactly the count ADR-0032 removed — where a spec of decisions
 * rewrites the 14 and lets the browser re-derive the rest.
 *
 * A list, not a light/dark pair: the brand's hues do not change between themes,
 * only the ramp they are placed on does, so one spec yields as many themes as
 * the design system defines.
 */
export interface Preset {
  /** Every theme the design system defines, built from `spec`. */
  readonly themes: readonly Theme[];
  /** What produced them. The name lives here, since a person edits it. */
  readonly spec: ThemeSpec;
}

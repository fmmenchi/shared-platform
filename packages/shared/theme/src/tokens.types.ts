/**
 * The token CONTRACT, as data — the single enumeration of every semantic role.
 *
 * These `as const` arrays are the source of truth: `./tokens.types.ts` derives
 * the theme types from them, and `src/tokens.test.ts` validates the CSS against
 * them (completeness, bridge coverage, WCAG contrast of the declared pairs).
 * Values live in `styles/vars.css` (reference light) and `styles/presets/*`
 * (overrides); consumers never import values from TS — components read `var(--fm-*)`.
 */

/* ---------- Color roles ---------- */

export const ACTION_FAMILIES = [
  'primary',
  'secondary',
  'accent',
  'destructive',
] as const;

export const ACTION_SUFFIXES = [
  '',
  '-foreground',
  '-hover',
  '-active',
  '-subtle',
  '-subtle-foreground',
  '-disabled',
  '-disabled-foreground',
] as const;

// `error` is a status/feedback family (Alerts, inline errors), DISTINCT from the
// `destructive` action family (destructive buttons): same red hue, but status
// treatment (subtle + border, no hover/active). Keeping them separate mirrors
// mature systems (Spectrum "negative", Atlassian "removed").
export const STATUS_FAMILIES = ['success', 'warning', 'info', 'error'] as const;

export const STATUS_SUFFIXES = [
  '',
  '-foreground',
  '-subtle',
  '-subtle-foreground',
  '-border',
] as const;

export const NEUTRAL_ROLES = [
  'neutral',
  'neutral-foreground',
  'neutral-subtle',
  'neutral-subtle-foreground',
  'neutral-border',
  'disabled',
  'disabled-foreground',
] as const;

export const SURFACE_ROLES = [
  'background',
  'foreground',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'muted',
  'muted-foreground',
  'border',
  'ring',
  'scrim',
  'link',
  'link-hover',
  'selection',
  'selection-foreground',
  'tooltip',
  'tooltip-foreground',
] as const;

export const INPUT_ROLES = [
  'input',
  'input-foreground',
  'input-hover',
  'input-active',
  'input-invalid',
  'input-disabled',
  'input-placeholder',
  'input-border',
] as const;

/** Every color role, flat — the completeness checklist for a theme. */
export const COLOR_ROLES: readonly ColorRole[] = [
  ...ACTION_FAMILIES.flatMap((f) =>
    ACTION_SUFFIXES.map((s) => `${f}${s}` as ColorRole),
  ),
  ...STATUS_FAMILIES.flatMap((f) =>
    STATUS_SUFFIXES.map((s) => `${f}${s}` as ColorRole),
  ),
  ...NEUTRAL_ROLES,
  ...SURFACE_ROLES,
  ...INPUT_ROLES,
];

/* ---------- Non-color tokens (inherit unless a preset overrides) ---------- */

export const RADIUS_TOKENS = ['sm', 'md', 'lg', 'xl'] as const;
export const SPACE_TOKENS = [
  'internal-xs',
  'internal-s',
  'internal-m',
  'inline-s',
  'inline-m',
  'inline-l',
  'stack-s',
  'stack-m',
  'stack-l',
  'inset-s',
  'inset-m',
  'inset-l',
] as const;
/**
 * The type scale, and the LEADING that goes with each step — one pairing, not
 * two scales a caller has to match by hand. Deferred until now on purpose: a
 * scale nothing consumes diverges from the utilities in silence, so it lands
 * with `Heading`, the component that settles it.
 *
 * The values are deliberately the ones the components ALREADY render (Tailwind's
 * own defaults, which they were using): adopting the shipped values makes the
 * scale ours without moving a pixel, where inventing one in the same change
 * would have re-typeset every component at once with no way to tell which
 * change caused what. Re-tuning is a separate decision, and now a possible one.
 */
export const TEXT_TOKENS = [
  'xs',
  'sm',
  'base',
  'lg',
  'xl',
  '2xl',
  '3xl',
  '4xl',
] as const;
export const FONT_TOKENS = ['sans', 'heading', 'mono'] as const;
export const FONT_WEIGHT_TOKENS = [
  'light',
  'regular',
  'medium',
  'semibold',
  'bold',
  'extrabold',
] as const;
export const BORDER_WIDTH_TOKENS = ['default', 'emphasis', 'divider'] as const;
export const SHADOW_TOKENS = ['sm', 'md', 'lg'] as const;
export const SIZE_TOKENS = ['container', 'prose', 'nav', 'aside'] as const;
export const DURATION_TOKENS = ['none', 'xs', 's', 'm', 'l'] as const;
export const EASE_TOKENS = [
  'standard',
  'enter',
  'exit',
  'linear',
  'spring',
  'bounce',
] as const;
export const TRANSITION_TOKENS = [
  'color',
  'transform',
  'shadow',
  'opacity',
  'size',
  'press',
] as const;
export const Z_TOKENS = [
  'dropdown',
  'sticky',
  'drawer',
  'modal-backdrop',
  'modal-content',
  'tooltip',
  'toast',
] as const;

/* ---------- CSS variable names ---------- */

export const colorVar = (r: ColorRole): string => `--fm-color-${r}`;

/** Every `--fm-*` variable the contract requires `vars.css` to define. */
export const TOKEN_VARS: readonly string[] = [
  ...COLOR_ROLES.map(colorVar),
  ...RADIUS_TOKENS.map((t) => `--fm-radius-${t}`),
  ...SPACE_TOKENS.map((t) => `--fm-space-${t}`),
  ...TEXT_TOKENS.map((t) => `--fm-text-${t}`),
  ...TEXT_TOKENS.map((t) => `--fm-leading-${t}`),
  ...FONT_TOKENS.map((t) => `--fm-font-${t}`),
  ...FONT_WEIGHT_TOKENS.map((t) => `--fm-font-weight-${t}`),
  ...BORDER_WIDTH_TOKENS.map((t) => `--fm-border-width-${t}`),
  ...SHADOW_TOKENS.map((t) => `--fm-shadow-${t}`),
  ...SIZE_TOKENS.map((t) => `--fm-size-${t}`),
  ...DURATION_TOKENS.map((t) => `--fm-duration-${t}`),
  ...EASE_TOKENS.map((t) => `--fm-ease-${t}`),
  ...TRANSITION_TOKENS.map((t) => `--fm-transition-${t}`),
  ...Z_TOKENS.map((t) => `--fm-z-${t}`),
];

/* ---------- Declared viewports (build-time media queries) ---------- */

/** Mobile is the base (no query); these are the min-width breakpoints. */
export const BREAKPOINTS = { tablet: '48rem', desktop: '64rem' } as const;

/** Declared CONTAINER-query breakpoints (component-width classes). */
export const CONTAINER_BREAKPOINTS = {
  sm: '24rem',
  md: '28rem',
  lg: '32rem',
  /* The width at which a sidebar and its content both fit — the page shell's
     swap point. Equal to the `tablet` VIEWPORT breakpoint on purpose and not by
     coincidence: a layout that is as wide as a tablet can hold two columns
     whether or not the window is. */
  xl: '48rem',
} as const;

/**
 * The seven PALETTE families — the families a ramp is generated for.
 *
 * SEVEN where the role families are eight: `destructive` (an action) and `error`
 * (a status) both draw from `negative`. Same red, different treatment — an action
 * has hover and active, a status has a subtle wash and a border — so they are two
 * role families over one palette family, and anything generating a ramp iterates
 * THIS list, not `ACTION_FAMILIES`.
 */
export const PALETTE_FAMILIES = [
  'primary',
  'secondary',
  'accent',
  'negative',
  'success',
  'warning',
  'info',
] as const;

/* ---------- The contract as types, derived from the arrays above ---------- */

/*
 * Every type here comes FROM the `as const` arrays in this file, which is why it
 * is in this file: the runtime checklist and the compile-time shape cannot drift
 * when neither can be edited without the other in view. `ColorRole` is not a
 * list somebody maintains — it is what the arrays already say, read as a union.
 */

// Not exported: these exist to build `ColorRole` below, and nothing outside
// this file has ever needed either half on its own.
type ActionFamily = (typeof ACTION_FAMILIES)[number];
type ActionSuffix = (typeof ACTION_SUFFIXES)[number];

type StatusFamily = (typeof STATUS_FAMILIES)[number];
type StatusSuffix = (typeof STATUS_SUFFIXES)[number];

export type ColorRole =
  | `${ActionFamily}${ActionSuffix}`
  | `${StatusFamily}${StatusSuffix}`
  | (typeof NEUTRAL_ROLES)[number]
  | (typeof SURFACE_ROLES)[number]
  | (typeof INPUT_ROLES)[number];

/**
 * A THEME: every colour role assigned a resolved colour. This is what "the
 * allowed themes" means, and what presets in apps must satisfy.
 */
export type Theme = Record<ColorRole, string>;

/* ---------- The same names, as TypeScript strings ---------- */

/**
 * The contract's SECOND SHAPE: the same names, as TypeScript strings.
 *
 * `tokens.ts` enumerates the names; this maps each one to the `var()` that reads
 * it, so `tokenVars.color.primary === 'var(--fm-color-primary)'`. For consumers
 * whose styles are written in TS — styled-components, emotion, vanilla-extract,
 * an inline `style` — and neither a port nor an adapter: CSS custom properties
 * are already the universal surface, and every styling library on the web reads
 * `var(--fm-*)` with nothing to inject.
 *
 * It adds no capability. What it adds is that a TYPO STOPS COMPILING instead of
 * rendering nothing, which is the failure a string literal gives you silently.
 *
 * NOT for React Native, which has no custom properties, and not inside a media
 * or container query, where `var()` is invalid in a feature value — the query
 * compiles, is dropped whole, and never matches. Breakpoints ship as literals
 * for that reason.
 */
/**
 * A group of token references: the token's own name, mapped to the `var()`
 * that reads it.
 *
 * The key is the TOKEN NAME, kebab and all — `'primary-foreground'`, not
 * `primaryForeground`. Searching `primary-foreground` finds the CSS, the
 * contract in `tokens.ts` and the call site in a consumer's styled-component,
 * because all three spell it the same. A camelCase key would read better and
 * would be a second vocabulary to keep in step with the first, which is the
 * kind of translation that quietly diverges.
 */
export type TokenRefGroup<Names extends readonly string[]> = {
  readonly [K in Names[number]]: string;
};

/** One group: every name in it, mapped to the `var()` that reads it. */
const group = <const Names extends readonly string[]>(
  prefix: string,
  names: Names,
): TokenRefGroup<Names> =>
  // FROZEN HERE TOO, not only on the object below: freezing the outer one
  // leaves every group writable, which is the whole surface anybody would
  // actually reach for — `Object.assign(tokenVars.color, brand)` is what
  // somebody mistakes for a theming hook.
  Object.freeze(
    Object.fromEntries(
      names.map((name) => [name, `var(--fm-${prefix}-${name})`]),
    ),
  ) as TokenRefGroup<Names>;

/**
 * THE TOKENS, AS REFERENCES — for every consumer whose styles are written in
 * TypeScript rather than in CSS.
 *
 * `vars.color.primary` is the string `'var(--fm-color-primary)'`. Not the
 * value: the reference. Which is the whole point — a reference re-points when
 * `[data-theme]` changes, and a value copied into a template literal does not.
 *
 * WHY THIS EXISTS, given that a custom property is already the universal port.
 * Every CSS library on the web can read `var(--fm-*)`, so nothing here adds a
 * capability; what it adds is that a typo stops being a silent no-op. Written
 * by hand, `var(--fm-color-primry)` renders as nothing at all and the first
 * person to notice is looking at the screen. Written as `vars.color.primry` it
 * does not compile.
 *
 *     import { tokenVars } from '@fmmenchi/theme';
 *
 *     const Panel = styled.section`
 *       background: ${tokenVars.color.card};
 *       color: ${tokenVars.color['card-foreground']};
 *       padding: ${tokenVars.space['inset-m']};
 *     `;
 *
 * The same string works in emotion, in vanilla-extract, in a `style={{}}` and
 * in anything else that takes a CSS value. There is no adapter per library and
 * there deliberately is not one: an adapter would mean this package importing
 * the consumer's styling library, which is what "framework-agnostic" forbids.
 *
 * NOT NAMED `t`, and not named `vars` either. `t` is what every i18n library
 * calls its translate function, and this platform ships beside one that does.
 * `vars` was worse in a quieter way: it is the canonical identifier of
 * vanilla-extract — `export const vars = createThemeContract(…)` is from their
 * own documentation — so the one audience this export names by name would have
 * collided with it on their first line. It also read ambiguously against this
 * package's own `styles/vars.css`.
 *
 * NOT VALUES. There is no `values.color.primary` here, and the reason is worth
 * knowing before asking for one: a value read at build time is the BASE theme's,
 * and a preset changes it at runtime, so the export would be right until
 * somebody switched theme. Where a real value is genuinely needed — a canvas, a
 * charting library — read it at the moment you need it:
 *
 *     getComputedStyle(el).getPropertyValue('--fm-color-primary').trim()
 *
 * with two things known first, because this package makes both of them worse
 * than they are elsewhere. A colour role is `@property`-registered, so the read
 * NEVER returns `''`: before the token stylesheet applies — or under an
 * ancestor with `all: initial` — it returns the registered `initial-value`,
 * `oklch(0 0 0)`. Registration turns a detectable failure into opaque black
 * with nothing falsy to branch on. And the serialisation is not uniform: a
 * registered role comes back computed and normalised, an unregistered token
 * comes back as the raw token stream, which Chrome and Safari prefix with a
 * space — hence the `.trim()`.
 *
 * NOT FOR REACT NATIVE. It has no custom properties at all, so
 * `'var(--fm-color-primary)'` is not a colour it can use and no DOM read exists
 * to fall back on. RN needs real values, which is a different export this
 * package does not have and would have to earn on its own terms.
 *
 * AND NOT IN A CONDITION. `var()` is invalid in a media or container query's
 * feature value, so `@media (min-width: ${tokenVars.size.container})` compiles
 * cleanly, is dropped whole by the browser, and never matches at any width —
 * the same silent class of failure this export exists to remove. Breakpoints
 * are exported as literals for exactly this: `BREAKPOINTS` and
 * `CONTAINER_BREAKPOINTS`.
 */
export const tokenVars = Object.freeze({
  color: group('color', COLOR_ROLES),
  radius: group('radius', RADIUS_TOKENS),
  space: group('space', SPACE_TOKENS),
  text: group('text', TEXT_TOKENS),
  /* The other half of the type pair. Never take one without the other — see
     the contract in AGENTS.md: an absolute leading is inherited as a frozen
     number and a descendant that changes its size keeps the ancestor's box. */
  leading: group('leading', TEXT_TOKENS),
  font: group('font', FONT_TOKENS),
  'font-weight': group('font-weight', FONT_WEIGHT_TOKENS),
  'border-width': group('border-width', BORDER_WIDTH_TOKENS),
  shadow: group('shadow', SHADOW_TOKENS),
  size: group('size', SIZE_TOKENS),
  duration: group('duration', DURATION_TOKENS),
  ease: group('ease', EASE_TOKENS),
  transition: group('transition', TRANSITION_TOKENS),
  z: group('z', Z_TOKENS),
} as const);

/** One of the seven families a ramp is generated for. */
export type PaletteFamily = (typeof PALETTE_FAMILIES)[number];

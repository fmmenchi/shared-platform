/**
 * The token CONTRACT, as data — the single enumeration of every semantic role.
 *
 * These `as const` arrays are the source of truth: `./tokens.types.ts` derives
 * the theme types from them, and `src/tokens.test.ts` validates the CSS against
 * them (completeness, bridge coverage, WCAG contrast of the declared pairs).
 * Values live in `styles/vars.css` (reference light) and `styles/presets/*`
 * (overrides); consumers never import values from TS — components read `var(--fm-*)`.
 */
import type { ColorRole } from './tokens.types.js';

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

/** Presets the platform ships as reference themes. `base` is `:root`. */
export const REFERENCE_PRESETS = ['base', 'dark'] as const;

/**
 * The COLOR SCHEMES a theme is built for. Same two names as the reference
 * presets and deliberately a separate list: a preset is a stylesheet we ship,
 * a scheme is an axis a theme has. If a third reference preset ever ships that
 * is not a scheme — a high-contrast variant, say — these stop being the same
 * two values, and `schemesAreReferencePresets` below is what makes that
 * divergence a compile error rather than a surprise.
 */
export const COLOR_SCHEMES = ['base', 'dark'] as const;

/**
 * The seven PALETTE families — level 1 of the token architecture, the families
 * a ramp is generated for.
 *
 * Deliberately SEVEN where the role families are eight: `destructive` (an
 * action) and `error` (a status) both draw from `negative`. Same red, different
 * treatment — an action has hover and active, a status has a subtle wash and a
 * border — so they are two role families over one palette family, and anything
 * generating a ramp iterates THIS list, not `ACTION_FAMILIES`.
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

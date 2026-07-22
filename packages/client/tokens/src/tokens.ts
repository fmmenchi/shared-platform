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

export const STATUS_FAMILIES = ['success', 'warning', 'info'] as const;

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
export const FONT_TOKENS = ['sans', 'heading', 'mono'] as const;
export const TEXT_TOKENS = [
  '2xs',
  'xs',
  'sm',
  'base',
  'lg',
  'xl',
  '2xl',
  '3xl',
  '4xl',
  '5xl',
] as const;
export const FONT_WEIGHT_TOKENS = [
  'light',
  'regular',
  'medium',
  'semibold',
  'bold',
  'extrabold',
] as const;
export const LEADING_TOKENS = ['tight', 'normal', 'relaxed'] as const;
export const BORDER_WIDTH_TOKENS = ['default', 'emphasis', 'divider'] as const;
export const SHADOW_TOKENS = ['sm', 'md', 'lg'] as const;
export const SIZE_TOKENS = ['container', 'prose'] as const;
export const DURATION_TOKENS = ['none', 'xs', 's', 'm', 'l'] as const;
export const EASE_TOKENS = ['standard', 'enter', 'exit', 'linear'] as const;
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
] as const;

/* ---------- CSS variable names ---------- */

export const colorVar = (r: ColorRole): string => `--fm-color-${r}`;

/** Every `--fm-*` variable the contract requires `vars.css` to define. */
export const TOKEN_VARS: readonly string[] = [
  ...COLOR_ROLES.map(colorVar),
  ...RADIUS_TOKENS.map((t) => `--fm-radius-${t}`),
  ...SPACE_TOKENS.map((t) => `--fm-space-${t}`),
  ...FONT_TOKENS.map((t) => `--fm-font-${t}`),
  ...TEXT_TOKENS.map((t) => `--fm-text-${t}`),
  ...FONT_WEIGHT_TOKENS.map((t) => `--fm-font-weight-${t}`),
  ...LEADING_TOKENS.map((t) => `--fm-leading-${t}`),
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
} as const;

/** Presets the platform ships as reference themes. `base` is `:root`. */
export const REFERENCE_PRESETS = ['base', 'dark'] as const;

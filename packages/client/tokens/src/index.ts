/**
 * Token skeleton — the *contract*, not the brand.
 *
 * Semantic token names + the CSS custom-property names they map to. Concrete
 * values (presets) live in `./styles/tailwind.css` (base) and
 * `./styles/presets/*.css` (overrides), applied via `[data-theme]` on a root.
 * Consumers never import values from here — components read `var(--fm-*)`.
 */

export type ColorToken =
  'bg' | 'fg' | 'muted' | 'primary' | 'primary-fg' | 'border' | 'ring';

export type RadiusToken = 'sm' | 'md' | 'lg';

export interface TokenSkeleton {
  color: Record<ColorToken, string>;
  radius: Record<RadiusToken, string>;
}

/** CSS custom-property name for a semantic color token. */
export const colorVar = (t: ColorToken): string => `--fm-color-${t}`;

/** CSS custom-property name for a radius token. */
export const radiusVar = (t: RadiusToken): string => `--fm-radius-${t}`;

/** Presets the platform ships as reference themes (bikeshed later). */
export const REFERENCE_PRESETS = ['base', 'alt'] as const;
export type ReferencePreset = (typeof REFERENCE_PRESETS)[number];

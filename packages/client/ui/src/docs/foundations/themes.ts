/**
 * Borrowed palettes for the rebrand demo: one base per family, taken from a
 * published brand's hue.
 *
 * They live in a story rather than in the package — shipping someone else's
 * palette under their name would be a use of their mark, not an example.
 */

export type ThemeName = 'stripe' | 'spotify' | 'airbnb';

export const THEMES: Record<ThemeName, { label: string; bases: string }> = {
  stripe: {
    label: 'Blurple',
    bases: `
      --fm-palette-primary-base: oklch(55% 0.2346 278);
      --fm-palette-secondary-base: oklch(55% 0.0373 249);
      --fm-palette-accent-base: oklch(55% 0.0971 220);
      --fm-palette-negative-base: oklch(55% 0.214 19);
      --fm-palette-success-base: oklch(55% 0.1786 143);
      --fm-palette-warning-base: oklch(55% 0.1126 75);
      --fm-palette-info-base: oklch(55% 0.1822 256);
    `,
  },
  spotify: {
    label: 'Green',
    bases: `
      --fm-palette-primary-base: oklch(55% 0.1506 149);
      --fm-palette-secondary-base: oklch(55% 0 256);
      --fm-palette-accent-base: oklch(55% 0.183 268);
      --fm-palette-negative-base: oklch(55% 0.2158 24);
      --fm-palette-success-base: oklch(55% 0.1506 149);
      --fm-palette-warning-base: oklch(55% 0.1179 67);
      --fm-palette-info-base: oklch(55% 0.1375 255);
    `,
  },
  airbnb: {
    label: 'Coral',
    bases: `
      --fm-palette-primary-base: oklch(55% 0.2004 22);
      --fm-palette-secondary-base: oklch(55% 0 256);
      --fm-palette-accent-base: oklch(55% 0.094 185);
      --fm-palette-negative-base: oklch(55% 0.1816 34);
      --fm-palette-success-base: oklch(55% 0.1786 143);
      --fm-palette-warning-base: oklch(55% 0.1112 78);
      --fm-palette-info-base: oklch(55% 0.1874 259);
    `,
  },
};

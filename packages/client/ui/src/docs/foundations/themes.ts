/**
 * Borrowed palettes for the rebrand demo, complete rather than primary-only.
 *
 * For every family: the base carries the brand's hue and chroma, the fill role
 * points at the ramp step whose lightness matches the brand colour, and the ink
 * is chosen by measurement — white where it clears 4.5 on that fill, the dark
 * neutral where it does not. A pale brand colour therefore keeps its own
 * lightness and takes dark text, instead of being darkened until white works.
 *
 * They live in a story rather than the package: shipping someone else's palette
 * under their name would be a use of their mark, not an example.
 */

export type ThemeName = 'stripe' | 'spotify' | 'airbnb';

export const THEMES: Record<ThemeName, { label: string; bases: string }> = {
  stripe: {
    label: 'Blurple',
    bases: `
      --fm-palette-primary-base: oklch(55% 0.2346 278);
      --fm-palette-secondary-base: oklch(55% 0.0373 249);
      --fm-palette-accent-base: oklch(55% 0.1459 220);
      --fm-palette-negative-base: oklch(55% 0.2214 19);
      --fm-palette-success-base: oklch(55% 0.2535 143);
      --fm-palette-warning-base: oklch(55% 0.165 75);
      --fm-palette-info-base: oklch(55% 0.1878 256);

      --fm-color-primary: var(--fm-palette-primary-400); /* #635BFF L58% -> 400, white 4.28 */
      --fm-color-primary-foreground: var(--fm-palette-neutral-760);
      --fm-color-primary-hover: var(--fm-palette-primary-500);
      --fm-color-primary-active: var(--fm-palette-primary-600);
      --fm-color-secondary: var(--fm-palette-secondary-700); /* #425466 L44% -> 700, white 8.80 */
      --fm-color-secondary-foreground: var(--fm-palette-neutral-0);
      --fm-color-secondary-hover: var(--fm-palette-secondary-800);
      --fm-color-secondary-active: var(--fm-palette-secondary-900);
      --fm-color-accent: var(--fm-palette-accent-200); /* #00D4FF L80% -> 200, white 1.80 */
      --fm-color-accent-foreground: var(--fm-palette-neutral-760);
      --fm-color-accent-hover: var(--fm-palette-accent-300);
      --fm-color-accent-active: var(--fm-palette-accent-400);
      --fm-color-destructive: var(--fm-palette-negative-400); /* #DF1B41 L58% -> 400, white 4.42 */
      --fm-color-destructive-foreground: var(--fm-palette-neutral-760);
      --fm-color-destructive-hover: var(--fm-palette-negative-500);
      --fm-color-destructive-active: var(--fm-palette-negative-600);
      --fm-color-success: var(--fm-palette-success-200); /* #00D924 L77% -> 200, white 1.72 */
      --fm-color-success-foreground: var(--fm-palette-neutral-760);
      --fm-color-warning: var(--fm-palette-warning-200); /* #FFB020 L81% -> 200, white 1.91 */
      --fm-color-warning-foreground: var(--fm-palette-neutral-760);
      --fm-color-info: var(--fm-palette-info-500); /* #0570DE L56% -> 500, white 4.95 */
      --fm-color-info-foreground: var(--fm-palette-neutral-0);
    `,
  },
  spotify: {
    label: 'Green',
    bases: `
      --fm-palette-primary-base: oklch(55% 0.187 149);
      --fm-palette-secondary-base: oklch(55% 0 256);
      --fm-palette-accent-base: oklch(55% 0.183 268);
      --fm-palette-negative-base: oklch(55% 0.2218 24);
      --fm-palette-success-base: oklch(55% 0.2124 149);
      --fm-palette-warning-base: oklch(55% 0.1626 67);
      --fm-palette-info-base: oklch(55% 0.1375 255);

      --fm-color-primary: var(--fm-palette-primary-300); /* #1DB954 L69% -> 300, white 2.48 */
      --fm-color-primary-foreground: var(--fm-palette-neutral-760);
      --fm-color-primary-hover: var(--fm-palette-primary-400);
      --fm-color-primary-active: var(--fm-palette-primary-500);
      --fm-color-secondary: var(--fm-palette-secondary-700); /* #535353 L44% -> 700, white 8.83 */
      --fm-color-secondary-foreground: var(--fm-palette-neutral-0);
      --fm-color-secondary-hover: var(--fm-palette-secondary-800);
      --fm-color-secondary-active: var(--fm-palette-secondary-900);
      --fm-color-accent: var(--fm-palette-accent-700); /* #2D46B9 L45% -> 700, white 9.35 */
      --fm-color-accent-foreground: var(--fm-palette-neutral-0);
      --fm-color-accent-hover: var(--fm-palette-accent-800);
      --fm-color-accent-active: var(--fm-palette-accent-900);
      --fm-color-destructive: var(--fm-palette-negative-400); /* #E22134 L59% -> 400, white 4.41 */
      --fm-color-destructive-foreground: var(--fm-palette-neutral-760);
      --fm-color-destructive-hover: var(--fm-palette-negative-500);
      --fm-color-destructive-active: var(--fm-palette-negative-600);
      --fm-color-success: var(--fm-palette-success-200); /* #1ED760 L77% -> 200, white 1.73 */
      --fm-color-success-foreground: var(--fm-palette-neutral-760);
      --fm-color-warning: var(--fm-palette-warning-200); /* #FFA42B L79% -> 200, white 1.93 */
      --fm-color-warning-foreground: var(--fm-palette-neutral-760);
      --fm-color-info: var(--fm-palette-info-400); /* #4687D6 L62% -> 400, white 3.96 */
      --fm-color-info-foreground: var(--fm-palette-neutral-760);
    `,
  },
  airbnb: {
    label: 'Coral',
    bases: `
      --fm-palette-primary-base: oklch(55% 0.2004 22);
      --fm-palette-secondary-base: oklch(55% 0 256);
      --fm-palette-accent-base: oklch(55% 0.1149 185);
      --fm-palette-negative-base: oklch(55% 0.1816 34);
      --fm-palette-success-base: oklch(55% 0.1855 143);
      --fm-palette-warning-base: oklch(55% 0.1706 78);
      --fm-palette-info-base: oklch(55% 0.1874 259);

      --fm-color-primary: var(--fm-palette-primary-300); /* #FF5A5F L69% -> 300, white 2.93 */
      --fm-color-primary-foreground: var(--fm-palette-neutral-760);
      --fm-color-primary-hover: var(--fm-palette-primary-400);
      --fm-color-primary-active: var(--fm-palette-primary-500);
      --fm-color-secondary: var(--fm-palette-secondary-500); /* #767676 L57% -> 500, white 4.85 */
      --fm-color-secondary-foreground: var(--fm-palette-neutral-0);
      --fm-color-secondary-hover: var(--fm-palette-secondary-600);
      --fm-color-secondary-active: var(--fm-palette-secondary-700);
      --fm-color-accent: var(--fm-palette-accent-300); /* #00A699 L65% -> 300, white 2.53 */
      --fm-color-accent-foreground: var(--fm-palette-neutral-760);
      --fm-color-accent-hover: var(--fm-palette-accent-400);
      --fm-color-accent-active: var(--fm-palette-accent-500);
      --fm-color-destructive: var(--fm-palette-negative-500); /* #C13515 L54% -> 500, white 5.29 */
      --fm-color-destructive-foreground: var(--fm-palette-neutral-0);
      --fm-color-destructive-hover: var(--fm-palette-negative-600);
      --fm-color-destructive-active: var(--fm-palette-negative-700);
      --fm-color-success: var(--fm-palette-success-500); /* #008A05 L55% -> 500, white 4.51 */
      --fm-color-success-foreground: var(--fm-palette-neutral-0);
      --fm-color-warning: var(--fm-palette-warning-200); /* #FFB400 L82% -> 200, white 1.91 */
      --fm-color-warning-foreground: var(--fm-palette-neutral-760);
      --fm-color-info: var(--fm-palette-info-300); /* #428BFF L65% -> 300, white 2.72 */
      --fm-color-info-foreground: var(--fm-palette-neutral-760);
    `,
  },
};

/**
 * Borrowed palettes, as HUES and as restraint — never as values.
 *
 * Each brand supplies an angle per family and how saturated it chose to be
 * there. Lightness comes from where our bases sit; chroma is the brand's own,
 * capped by what sRGB allows at that lightness. A borrowed palette therefore
 * arrives already inside this system's gamut and contrast rules instead of
 * having to be argued into them — and a brand whose secondary is a grey keeps
 * it grey, because that restraint is the decision worth copying.
 *
 * These belong to a Storybook story, not to the published package: they are a
 * demonstration of what the primitive layer costs to re-skin, and shipping a
 * third party's palette under their name would be a use of their mark rather
 * than an example.
 *
 * A pure grey has no hue at all (`#535353` gives `undefined`), so those take the
 * neutral angle — a brand's grey is grey whichever angle it is filed under.
 */

export type ThemeName = 'stripe' | 'spotify' | 'airbnb';

export const THEMES: Record<ThemeName, { label: string; bases: string }> = {
  stripe: {
    label: 'Blurple — cool, high-chroma brand, quiet slate secondary',
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
    label: 'Green — the brand IS the success hue, secondary a true grey',
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
    // The instructive one. A coral brand puts `primary` in the same hue family
    // as `destructive`, and on screen the submit button and the delete button
    // stop being distinguishable. No token system can prevent that: the ramp
    // did its job, the brand made a choice, and the collision is a DESIGN
    // decision someone has to take — move destructive darker, or give it a
    // different signal than colour alone. Worth seeing, which is why this theme
    // is here.
    label:
      'Coral — warm brand; note that primary and destructive collide, and why',
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

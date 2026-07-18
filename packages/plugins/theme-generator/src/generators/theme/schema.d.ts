export interface ThemeGeneratorSchema {
  /** Theme name — becomes the `data-theme` attribute value. */
  name: string;
  /** The project the theme belongs to (gets the validate-themes target). */
  project: string;
  /** Directory for the theme file, relative to the project root. */
  directory?: string;
  /** Do not wire the validate-themes target. */
  skipValidation?: boolean;
  /** Advanced: explicit path to @fmmenchi/tokens' vars.css. */
  tokensPath?: string;
}

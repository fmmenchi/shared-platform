export interface ThemeGeneratorSchema {
  /** Theme name — becomes the `data-theme` attribute value. */
  name: string;
  /** The project the theme belongs to (gets the validate-themes target). */
  project: string;
  /** Directory for the theme file, relative to the project root. */
  directory?: string;
  /**
   * Do not gate this theme: skips BOTH wiring the `validate-themes` target and
   * the pre-write check on a `--from` file. One flag, one meaning.
   */
  skipValidation?: boolean;
  /** Whether this is a light or a dark theme — emitted as `color-scheme`. */
  scheme?: 'light' | 'dark';
  /**
   * Path to a theme file to install, instead of scaffolding from the contract.
   *
   * Only its `declarations` object is read — a flat map of `--fm-*` custom
   * property to value, at whatever layer: a base, a ramp step and a role are all
   * declarations, and this generator does not tell them apart. Every other key,
   * including whatever the builder keeps to reopen its own form, is ignored.
   */
  from?: string;
  /** Advanced: explicit path to @fmmenchi/tokens' vars.css. */
  tokensPath?: string;
}

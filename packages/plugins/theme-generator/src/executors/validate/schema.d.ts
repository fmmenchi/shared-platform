export interface ValidateExecutorSchema {
  /** Workspace-relative paths of the theme CSS files to validate. */
  themes: string[];
  /**
   * Where the reference `vars.css` is, when `@fmmenchi/tokens` cannot be resolved
   * from the workspace root. A theme's roles may point at palette rungs the
   * reference stylesheet declares, so resolution needs it underneath — the same
   * escape hatch the `theme` generator has, and for the same reason.
   */
  tokensPath?: string;
}

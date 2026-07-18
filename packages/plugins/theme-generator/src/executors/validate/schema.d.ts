export interface ValidateExecutorSchema {
  /** Workspace-relative paths of the theme CSS files to validate. */
  themes: string[];
  /** Advanced: explicit path to @fmmenchi/tokens' validate module. */
  tokensPath?: string;
}

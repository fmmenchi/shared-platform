export interface ErrorExecutorSchema {
  /** Name shown in the alert. Defaults to the project the target runs on. */
  appName?: string;
  /** What went wrong. Falls back to `ERROR_MESSAGE`. Empty → skip. */
  message?: string;
  /** Link the "See the run" button points at. Falls back to `ERROR_URL`. */
  url?: string;
}

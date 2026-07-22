export interface ErrorExecutorSchema {
  /** The project name shown in the alert, e.g. `dev-blog`. */
  appName: string;
  /** What went wrong. Falls back to `ERROR_MESSAGE`. Empty → skip. */
  message?: string;
  /** Link the "See the run" button points at. Falls back to `ERROR_URL`. */
  url?: string;
}

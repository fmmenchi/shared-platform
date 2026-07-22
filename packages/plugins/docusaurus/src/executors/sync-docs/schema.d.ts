export interface SyncDocsExecutorSchema {
  /** Where to assemble the docs, relative to the workspace root. */
  targetPath: string;
  /** Keep running and re-sync on filesystem changes (dev server). */
  watch?: boolean;
}

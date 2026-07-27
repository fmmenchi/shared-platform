/** One doc-enabled project: its Nx name, root, and unscoped folder. */
export interface NxProjectDocEntry {
  /** Nx project name, e.g. `@fmmenchi/notify`. */
  name: string;
  /** Project root, e.g. `packages/shared/notify`. */
  root: string;
  /** Destination folder under the category — the unscoped name (`notify`, `nx-notify`). */
  folder: string;
}

/**
 * The manifest `config-generator` writes and `sync-docs` reads: a map of **category →
 * projects**. The category is the value of each project's `doc:<x>` tag, so the site groups by
 * whatever taxonomy the consuming workspace declares — the plugin hardcodes nothing. The consumer
 * labels + orders each category with its own `docs/<category>/_category_.json`.
 */
export type DocusaurusProjectsConfig = Record<string, NxProjectDocEntry[]>;

/** The doc categories the site groups projects under. No apps in this monorepo. */
export const documentationTypes = ['library', 'plugin'] as const;
export type DocumentationType = (typeof documentationTypes)[number];

/** One doc-enabled project: its Nx name, root, unscoped folder, and category. */
export interface NxProjectDocEntry {
  /** Nx project name, e.g. `@fmmenchi/notify`. */
  name: string;
  /** Project root, e.g. `packages/shared/notify`. */
  root: string;
  /** Destination folder under the category — the unscoped name (`notify`, `nx-notify`). */
  folder: string;
  type: DocumentationType;
}

/** The manifest `config-generator` writes and `sync-docs` reads. */
export interface DocusaurusProjectsConfig {
  libraries: NxProjectDocEntry[];
  plugins: NxProjectDocEntry[];
}

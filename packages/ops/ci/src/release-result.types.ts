/**
 * What a release actually did, said by the operation that did it.
 *
 * Deliberately neutral: no notification, SBOM or Slack concept leaks in here. A release
 * is one operation and announcing it is another — fusing them would let a message-shaped
 * bug break an irreversible step, and would make the announcement impossible to retry on
 * its own. This record is the seam between them, and every downstream consumer reads it.
 */
export interface ReleaseRecord {
  /** The nx project that was released. */
  project: string;
  /** The version it was released at. */
  version: string;
  /** The git tag nx cut for it, formed with that project's own release-group pattern. */
  tag: string;
}

/** The `projectsVersionData` shape `nx/release` returns — only what we read from it. */
export type ProjectsVersionData = Record<
  string,
  { newVersion?: string | null; currentVersion?: string | null }
>;

/** A release group as `nx/release` reports it — only what we read from it. */
export interface ReleaseGroupSummary {
  name: string;
  projects: readonly string[];
  releaseTag?: { pattern?: string };
}

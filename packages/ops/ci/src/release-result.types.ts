/**
 * What a release actually did, said by the operation that did it.
 *
 * Deliberately neutral: no notification, SBOM or Slack concept leaks in here. A release
 * is one operation and announcing it is another — fusing them would let a message-shaped
 * bug break an irreversible step, and would make the announcement impossible to retry on
 * its own. This record is the seam between them, and every downstream consumer reads it.
 *
 * Every field is HANDED OVER by nx, never reconstructed: the tag as nx formed it, the
 * notes as nx rendered them. Nothing downstream has to parse a tag or ask GitHub for text
 * that was produced in this same process.
 */
export interface ReleaseRecord {
  /** The nx project that was released. */
  project: string;
  /** The version it was released at. */
  version: string;
  /** The git tag nx cut for it (`ReleaseVersion.gitTag`). */
  tag: string;
  /** The changelog nx rendered for it, as it appears in the GitHub Release. */
  notes?: string;
}

/** The `projectsVersionData` shape `nx/release` returns — only what we read from it. */
export type ProjectsVersionData = Record<
  string,
  { newVersion?: string | null; currentVersion?: string | null }
>;

/**
 * The per-project changelog `releaseChangelog` returns — only what we read from it. This
 * is where the tag and the notes come from, first-hand.
 */
export type ProjectChangelogs = Record<
  string,
  { releaseVersion?: { gitTag?: string }; contents?: string }
>;

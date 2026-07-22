export interface ReleaseExecutorSchema {
  /** The project name shown in the message, e.g. `dev-blog`. */
  appName: string;
  /** Version without the leading `v`. Falls back to `RELEASE_VERSION`. Empty → skip. */
  version?: string;
  /** Link the "View release" button points at. Falls back to `RELEASE_URL`. */
  url?: string;
  /** Changelog range start (sha or tag). Falls back to `RELEASE_FROM`. */
  from?: string;
  /** Changelog range end (sha or tag). Falls back to `RELEASE_TO`. */
  to?: string;
  /** Include merge commits in the changelog (default true). */
  includeMerges?: boolean;
  /**
   * Pre-rendered markdown notes (e.g. a GitHub Release body). When set, it is used as the
   * changelog verbatim (converted to Slack mrkdwn) and the git range is ignored. Falls
   * back to `RELEASE_BODY`.
   */
  body?: string;
}

/**
 * The shapes this module borrows from `nx/release`, declared structurally.
 *
 * Deliberately minimal and structural rather than imported: the release ENTRYPOINT is where
 * the coupling to nx's internals lives and is paid for, and these helpers are the part that
 * has to stay testable without booting a project graph. What is described here is only what
 * is actually read — a narrower promise is a smaller thing to be wrong about.
 */

/** A release group, reduced to what forms a tag. */
export interface ReleaseGroupTagConfig {
  name: string;
  releaseTag: { pattern: string };
}

/** The slice of nx's `ReleaseGraph` used to find a project's tag pattern. */
export interface TagPatternSource {
  getReleaseGroupForProject(
    project: string,
  ): ReleaseGroupTagConfig | undefined | null;
}

/**
 * nx's `ReleaseVersion`, injected rather than imported.
 *
 * It is the class that interpolates the tag pattern AND applies nx's project-name
 * sanitisation, so the tag has to come from it. Taking it as a parameter keeps this function
 * a pure mapping — the spec passes a stand-in and asserts the mapping, while the entrypoint
 * passes the real one and gets nx's exact string.
 */
export interface ReleaseVersionCtorArg {
  version: string;
  releaseTagPattern: string;
  projectName?: string;
  releaseGroupName?: string;
}

export type ReleaseVersionCtor = new (args: ReleaseVersionCtorArg) => {
  gitTag: string;
};

/**
 * A resolved changelog config, as far as "does it ask for a hosted release?" is concerned.
 * `false` means the changelog is disabled outright for that scope.
 */
export type RemoteReleaseConfig =
  false | null | undefined | { createRelease?: unknown };

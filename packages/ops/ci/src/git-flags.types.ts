/** The git args the `nx/release` subcommand APIs require to be passed explicitly. */
export interface GitFlags {
  gitCommit: boolean;
  gitTag: boolean;
  stageChanges: boolean;
  /** Only the changelog step pushes; the version step has nothing to push yet. */
  gitPush?: boolean;
}

/** Per-subcommand git overrides, as nx accepts them under `release.version`/`release.changelog`. */
export interface GitConfig {
  commit?: boolean;
  tag?: boolean;
  push?: boolean;
  stageChanges?: boolean;
}

/**
 * The slice of `nx.json`'s `release` config that decides the git behaviour.
 *
 * Deliberately structural and minimal: this package must read a CONSUMER's config, and a
 * consumer's nx version may know keys this one does not.
 */
export interface ReleaseGitConfig {
  git?: GitConfig;
  version?: { git?: GitConfig };
  changelog?: {
    git?: GitConfig;
    workspaceChangelog?: unknown;
    projectChangelogs?: unknown;
  };
  groups?: Record<string, { changelog?: unknown } | undefined>;
}

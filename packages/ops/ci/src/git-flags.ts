import type {
  GitConfig,
  GitFlags,
  ReleaseGitConfig,
} from './git-flags.types.js';

/**
 * The git flags for one `nx/release` subcommand, taken from the CONSUMER's config.
 *
 * Why this exists at all: `releaseVersion` and `releaseChangelog` refuse to run next to a
 * top-level `release.git` unless `gitCommit`, `gitTag` and `stageChanges` are all passed —
 * that is how nx tells the subcommand API apart from the `nx release` CLI. So they must be
 * passed. The bug was passing OUR values: `gitCommit: true` is what this workspace wants, and
 * hardcoding it silently overrode `release.git.commit: false` in a consumer that deliberately
 * does not commit version bumps. Reported from there: the dry run died with "No changed files
 * to commit", and a real run would have started pushing bump commits to their trunk.
 *
 * A published release script may decide the ORDER of the steps. It may not decide whether the
 * consumer's trunk receives commits.
 *
 * The defaults reproduce nx's own, which differ per subcommand (nx `config.ts`:
 * `versionGitDefaults` / `changelogGitDefaults`) — so a repo with no `release.git` at all
 * behaves exactly as plain `nx release` would.
 */
export function gitFlagsFor(
  step: 'version' | 'changelog',
  release: ReleaseGitConfig | undefined,
): GitFlags {
  const top: GitConfig = release?.git ?? {};

  // nx's own derivation, from `release.js` in the combined command — same names, so the two
  // can be compared line by line if nx changes it:
  //   shouldCommit = git.commit ?? true
  //   shouldStage  = (shouldCommit || git.stageChanges) ?? false
  //   shouldTag    = git.tag ?? true
  //   shouldPush   = a remote release has to be created
  const shouldCommit = top.commit ?? true;
  const shouldStage = shouldCommit || top.stageChanges || false;
  const shouldTag = top.tag ?? true;
  const shouldPush = top.push ?? createsRelease(release);

  // A per-subcommand override still wins — `release.version.git` / `release.changelog.git` is
  // what nx's own error message points a subcommand user at.
  const own: GitConfig =
    (step === 'version' ? release?.version?.git : release?.changelog?.git) ??
    {};

  if (step === 'version') {
    // ONE commit and ONE tag per release, at the end — which is why these are false here even
    // when the consumer asked to commit. The combined `nx release` does exactly this: it passes
    // gitCommit/gitTag false to BOTH subcommands and performs the git operations itself
    // afterwards. Propagating the top-level config to both steps instead would commit twice and
    // then fail on a duplicate tag.
    return {
      gitCommit: own.commit ?? false,
      gitTag: own.tag ?? false,
      stageChanges: own.stageChanges ?? shouldStage,
    };
  }

  return {
    gitCommit: own.commit ?? shouldCommit,
    gitTag: own.tag ?? shouldTag,
    stageChanges: own.stageChanges ?? shouldStage,
    gitPush: own.push ?? shouldPush,
  };
}

const isCreateReleaseEnabled = (data: unknown): boolean =>
  typeof data === 'object' &&
  data !== null &&
  'createRelease' in data &&
  (typeof (data as { createRelease?: unknown }).createRelease === 'string' ||
    (typeof (data as { createRelease?: unknown }).createRelease === 'object' &&
      (data as { createRelease?: unknown }).createRelease !== null));

/** Whether any changelog config asks for a hosted release — root, projects, or a group. */
function createsRelease(release: ReleaseGitConfig | undefined): boolean {
  return (
    isCreateReleaseEnabled(release?.changelog?.workspaceChangelog) ||
    isCreateReleaseEnabled(release?.changelog?.projectChangelogs) ||
    Object.values(release?.groups ?? {}).some((group) =>
      isCreateReleaseEnabled(group?.changelog),
    )
  );
}

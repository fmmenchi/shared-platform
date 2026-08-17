import type {
  ProjectsVersionData,
  ReleaseGroupSummary,
  ReleaseRecord,
} from './release-result.types.js';

/**
 * Mirrors nx's `sanitizeProjectNameForGitTag`
 * (`nx/src/command-line/release/utils/git.ts`): nx sanitises the project name before
 * interpolating it, so a tag formed without this would simply not be the tag nx cut.
 * Kept as an explicit mirror because the function is internal to nx and not exported.
 */
export function sanitizeProjectName(name: string): string {
  return (
    name
      .replace(/:/g, '/')
      // eslint-disable-next-line no-control-regex -- this IS nx's GIT_INVALID_REF_CHARS_REGEX; git refs forbid these
      .replace(/[\x00-\x1f\x7f ~^?*[\\]/g, '-')
      .replace(/\/+/g, '/')
      .replace(/\.{2,}/g, '.')
      .replace(/^\/+/, '')
      .replace(/\/+$/, '')
  );
}

/**
 * Forms the tag for a release the way nx forms it: filling that project's own
 * release-group pattern with the same three placeholders nx supports, and sanitising the
 * project name first. Forming is not parsing — the pattern comes from the release config
 * nx itself used, so a group shaped `gh-actions/v{version}` or `{releaseGroupName}/v{version}`
 * comes out right without anyone encoding a convention in a regex.
 *
 * This is a mirror of somebody else's logic, so it is checked rather than trusted: the
 * release entrypoint verifies every tag it forms against the tags git actually has.
 */
export function formatTag(
  pattern: string,
  project: string,
  version: string,
  releaseGroupName = '',
): string {
  return pattern
    .replace(/\{projectName\}/g, sanitizeProjectName(project))
    .replace(/\{version\}/g, version)
    .replace(/\{releaseGroupName\}/g, releaseGroupName);
}

/**
 * Checks that nx returned the shape we read, and says so loudly when it doesn't.
 *
 * The compiler cannot do this for us: nx's own `ReleaseGroupWithName` does not even
 * declare `projects` (it survives a chain of conditional type transforms), while at
 * runtime it is there — so any typed handshake with that value is a cast, and a cast is
 * a promise nobody checks. nx has already moved this corner once (`releaseTagPattern` →
 * `releaseTag.pattern`) and its own source carries a `TODO(v24)` for the next move. When
 * that happens we want a red build, not a plausible tag.
 */
export function assertReleaseGroups(value: unknown): ReleaseGroupSummary[] {
  if (!Array.isArray(value)) {
    throw new Error(
      `nx-release: expected an array of release groups, got ${typeof value}.`,
    );
  }
  return value.map((group) => {
    const { name, projects, releaseTag } = (group ?? {}) as ReleaseGroupSummary;
    if (
      typeof name !== 'string' ||
      !Array.isArray(projects) ||
      typeof releaseTag?.pattern !== 'string'
    ) {
      throw new Error(
        `nx-release: a release group from nx is not the shape we read ` +
          `(need name, projects[], releaseTag.pattern; got ${JSON.stringify(group)?.slice(0, 120)}). ` +
          `nx's release-graph shape changed — refusing to form tags from a guess.`,
      );
    }
    return { name, projects, releaseTag };
  });
}

/**
 * Turns what `nx/release` returned into the release record.
 *
 * Only projects that actually got a new version are in it: `projectsVersionData` also
 * lists projects nx considered and left alone, and a release that "announces" an
 * unchanged package is a lie. Order follows the version data, which is nx's own.
 *
 * Throws when a group carries no tag pattern. nx's own config type fills it in for every
 * group, so an absent one does not mean "use the default" — it means the shape nx returns
 * has changed under us (it renamed `releaseTagPattern` to `releaseTag.pattern` once
 * already). Guessing there would fabricate a package-shaped tag for a group that uses a
 * different convention, and the announce step would then post about a release nobody cut.
 */
export function toReleaseRecords(
  projectsVersionData: ProjectsVersionData,
  releaseGroups: readonly ReleaseGroupSummary[],
): ReleaseRecord[] {
  const groupFor = (project: string): ReleaseGroupSummary => {
    const group = (releaseGroups ?? []).find((candidate) =>
      candidate.projects.includes(project),
    );
    if (!group?.releaseTag?.pattern) {
      throw new Error(
        `nx-release: no tag pattern for "${project}" (group: ${group?.name ?? 'none'}). ` +
          `Every release group carries one, so this means nx's release-graph shape changed — ` +
          `refusing to guess a tag rather than announce a release that was never cut.`,
      );
    }
    return group;
  };

  return Object.entries(projectsVersionData ?? {}).flatMap(
    ([project, data]) => {
      const version = data?.newVersion;
      if (!version) return [];
      const group = groupFor(project);
      return [
        {
          project,
          version,
          tag: formatTag(
            group.releaseTag?.pattern ?? '',
            project,
            version,
            group.name,
          ),
        },
      ];
    },
  );
}

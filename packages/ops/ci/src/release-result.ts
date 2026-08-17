import type {
  ProjectsVersionData,
  ReleaseGroupSummary,
  ReleaseRecord,
} from './release-result.types.js';

/** nx's default tag pattern, used when a group declares none of its own. */
const DEFAULT_TAG_PATTERN = '{projectName}@{version}';

/**
 * Forms the tag for a release the way nx formed it: by filling that project's own
 * release-group pattern. Forming is not parsing — the pattern is read from the release
 * config nx itself used, so a group with a different shape (`gh-actions/v{version}`)
 * comes out right without anybody encoding a convention in a regex or a `${tag%@*}`.
 */
export function formatTag(
  pattern: string,
  project: string,
  version: string,
): string {
  return pattern
    .replace('{projectName}', project)
    .replace('{version}', version);
}

/**
 * Turns what `nx/release` returned into the release record.
 *
 * Only projects that actually got a new version are in it: `projectsVersionData` also
 * lists projects nx considered and left alone, and a release that "announces" an
 * unchanged package is a lie. Order follows the version data, which is nx's own.
 */
export function toReleaseRecords(
  projectsVersionData: ProjectsVersionData,
  releaseGroups: readonly ReleaseGroupSummary[],
): ReleaseRecord[] {
  const patternFor = (project: string): string =>
    releaseGroups.find((group) => group.projects.includes(project))?.releaseTag
      ?.pattern ?? DEFAULT_TAG_PATTERN;

  return Object.entries(projectsVersionData ?? {}).flatMap(
    ([project, data]) => {
      const version = data?.newVersion;
      if (!version) return [];
      return [
        {
          project,
          version,
          tag: formatTag(patternFor(project), project, version),
        },
      ];
    },
  );
}

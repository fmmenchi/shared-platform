import type {
  ProjectChangelogs,
  ProjectsVersionData,
  ReleaseRecord,
} from './release-result.types.js';

/**
 * Turns what `nx/release` returned into the release record.
 *
 * Nothing here forms, parses or guesses. The version comes from `releaseVersion`, and the
 * tag and the notes from `releaseChangelog` — `ReleaseVersion.gitTag` is the very string nx
 * used to tag, and `contents` is the very text nx wrote into the GitHub Release. An earlier
 * version of this file mirrored nx's tag interpolation (including its project-name
 * sanitisation) and then verified the result against git; all of that is deleted, because
 * a value you are handed needs no mirror and no verification.
 *
 * Only projects that actually got a new version are recorded: `projectsVersionData` also
 * lists projects nx considered and left alone, and a release that "announces" an unchanged
 * package is a lie.
 *
 * Throws when a released project has no tag. That means nx changed what it hands back, and
 * the alternative — inventing the tag — is how an announcement ends up pointing at a
 * release nobody cut.
 */
export function toReleaseRecords(
  projectsVersionData: ProjectsVersionData,
  projectChangelogs: ProjectChangelogs,
): ReleaseRecord[] {
  return Object.entries(projectsVersionData ?? {}).flatMap(
    ([project, data]) => {
      const version = data?.newVersion;
      if (!version) return [];

      const changelog = (projectChangelogs ?? {})[project];
      const tag = changelog?.releaseVersion?.gitTag;
      if (!tag) {
        throw new Error(
          `nx-release: nx released ${project}@${version} but handed back no git tag for it. ` +
            `Refusing to form one: a tag that does not exist takes the announcement and the ` +
            `SBOM upload with it.`,
        );
      }

      return [
        {
          project,
          version,
          tag,
          ...(changelog?.contents ? { notes: changelog.contents } : {}),
        },
      ];
    },
  );
}

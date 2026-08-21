import type {
  ProjectChangelogs,
  ProjectsVersionData,
  ReleaseRecord,
} from './release-result.types.js';

/**
 * Turns what `nx/release` returned into the release record.
 *
 * Nothing here forms, parses or guesses. The version comes from `releaseVersion`; the tag
 * from `tagsByProject`, which formed it with nx's own `ReleaseVersion` and cross-checked it
 * against the tags nx is cutting; the notes from `releaseChangelog`, when the consumer
 * configured changelogs at all. An earlier version of this file mirrored nx's tag
 * interpolation and then verified the result against git; all of that is deleted, because a
 * value you are handed needs no mirror and no verification.
 *
 * THE NOTES ARE OPTIONAL AND THE TAG IS NOT, and that asymmetry is the point. Both used to
 * come out of `projectChangelogs`, which nx populates only for a consumer who configured
 * project changelogs — so on nx's DEFAULT config the map came back empty and the record
 * could not be built at all, after the release had already been cut. The tag no longer
 * depends on that step. A consumer without changelogs now gets a complete record with no
 * notes in it, which is exactly what they asked for.
 *
 * Only projects that actually got a new version are recorded: `projectsVersionData` also
 * lists projects nx considered and left alone, and a release that "announces" an unchanged
 * package is a lie.
 */
export function toReleaseRecords(
  projectsVersionData: ProjectsVersionData,
  tagByProject: ReadonlyMap<string, string>,
  projectChangelogs: ProjectChangelogs = {},
): ReleaseRecord[] {
  return Object.entries(projectsVersionData ?? {}).flatMap(
    ([project, data]) => {
      const version = data?.newVersion;
      if (!version) return [];

      const tag = tagByProject.get(project);
      if (!tag) {
        throw new Error(
          `nx-release: nx released ${project}@${version} but no tag was formed for it. ` +
            `Refusing to invent one: a tag that does not exist takes the announcement and ` +
            `the SBOM upload with it.`,
        );
      }

      const notes = (projectChangelogs ?? {})[project]?.contents;

      return [{ project, version, tag, ...(notes ? { notes } : {}) }];
    },
  );
}

/** A project graph, reduced to the one thing publishing depends on. */
export type PublishTargets = Record<
  string,
  { data?: { targets?: Record<string, unknown> } } | undefined
>;

/**
 * The released projects that can actually be published.
 *
 * `nx-release-publish` is added by `@nx/js` — and NOT added to a package with
 * `"private": true`. `releasePublish` throws outright when none of the projects it matched
 * has that target, which is the normal state of a repo that versions and tags but publishes
 * nothing: a blog, an app, any private deliverable. Releasing there is legitimate and the
 * failure is not, so the caller asks this first and skips publishing when the answer is
 * empty. A mixed workspace is unaffected: nx only refuses when NOTHING is publishable.
 */
export function publishableProjects(
  records: readonly ReleaseRecord[],
  nodes: PublishTargets,
): ReleaseRecord[] {
  return records.filter(
    (record) => nodes[record.project]?.data?.targets?.['nx-release-publish'],
  );
}

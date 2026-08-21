import type { ProjectsVersionData } from './release-result.types.js';
import type {
  ReleaseVersionCtor,
  ReleaseVersionCtorArg,
  RemoteReleaseConfig,
  TagPatternSource,
} from './release-git.types.js';

/**
 * The hosted-release provider a resolved changelog config asks for, or `undefined` when it
 * asks for none. Truthy means "create a GitHub/GitLab release with this".
 *
 * The ONE piece of nx's top-level `release()` that cannot be imported — it is a module-private
 * helper there — so it is reproduced, and it is four lines. It returns the provider rather
 * than a boolean on purpose: the caller needs that value anyway to build the client, and a
 * predicate would have left it re-reading the same field through a cast.
 *
 * nx's own test is `createRelease !== false`, which treats an ABSENT value as "create one".
 * That is safe for nx because it only ever runs on the resolved config, where the field is
 * always present. This is stricter — absent means none — because the difference only shows up
 * when something is already wrong, and creating a release against an undefined provider is
 * the worse of the two failures.
 */
export function remoteReleaseProviderOf(
  changelogConfig: RemoteReleaseConfig,
): unknown {
  if (!changelogConfig || typeof changelogConfig !== 'object') return undefined;
  const { createRelease } = changelogConfig;
  return createRelease === false ? undefined : createRelease;
}

/**
 * The tag nx will cut, per released project.
 *
 * The record is per project, and this is the only mapping that is per project: nx's flat
 * `createGitTagValues` cuts ONE tag for a whole fixed group, so it can say which tags exist
 * but not which project each belongs to. So the tag is formed here, by nx's own
 * `ReleaseVersion`, from the tag pattern nx resolved onto the project's release group —
 * never by interpolating a pattern by hand, and never by cutting a project name back out of
 * a tag (`gh-actions/v0.4.0` has no project name in it to cut).
 *
 * CROSS-CHECKED against the flat list nx produced for the same run. The two are derived
 * independently — one by nx's tag-values function, one by nx's ReleaseVersion class — so
 * agreement is evidence and disagreement means nx changed something underneath us. It throws
 * there, because the alternative is a record that names a tag nobody cut, and every
 * downstream step (the SBOM upload, the announcement, the release link) believes the record.
 *
 * Only projects that actually got a new version are mapped: `projectsVersionData` also lists
 * the projects nx considered and left alone.
 */
export function tagsByProject(
  projectsVersionData: ProjectsVersionData,
  graph: TagPatternSource,
  releaseVersionCtor: ReleaseVersionCtor,
  expectedTags: ReadonlySet<string>,
): Map<string, string> {
  const tags = new Map<string, string>();

  for (const [project, data] of Object.entries(projectsVersionData ?? {})) {
    const version = data?.newVersion;
    if (!version) continue;

    const group = graph.getReleaseGroupForProject(project);
    if (!group) {
      throw new Error(
        `nx-release: nx released ${project}@${version} but it belongs to no release group, ` +
          `so there is no tag pattern to form its tag from.`,
      );
    }

    const arg: ReleaseVersionCtorArg = {
      version,
      releaseTagPattern: group.releaseTag.pattern,
      projectName: project,
      releaseGroupName: group.name,
    };
    const { gitTag } = new releaseVersionCtor(arg);

    if (!expectedTags.has(gitTag)) {
      throw new Error(
        `nx-release: formed the tag "${gitTag}" for ${project}@${version}, but nx is not ` +
          `cutting it (it will cut: ${[...expectedTags].join(', ') || '(none)'}). ` +
          `Refusing to record a tag that will not exist.`,
      );
    }

    tags.set(project, gitTag);
  }

  return tags;
}

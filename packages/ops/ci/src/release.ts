#!/usr/bin/env node
// The CI release entrypoint: run the release, then say what it did.
//
// Every fact is HANDED OVER by nx, never reconstructed: the versions, the tags as nx forms
// them, and the release notes as nx renders them. What this replaced, in order: a
// photograph of the git tags before and after shelling out to the CLI; then a mirror of
// nx's own tag interpolation, checked against git because a mirror cannot be trusted; and,
// for a moment, a GitHub API round trip to read back the changelog nx had just written.
// Each one was a way of asking downstream what was already known upstream.
//
// THE SAME MISTAKE CAME BACK ONCE MORE, IN THE GIT CONFIG, AND THIS FILE IS WHERE IT ENDS.
// `releaseVersion`/`releaseChangelog` refuse to run beside a top-level `release.git` unless
// gitCommit, gitTag and stageChanges are all passed (nx `version.js`/`changelog.js`: that is
// how the subcommands tell the top-level command apart from a direct API call). So the flags
// must be passed — and this script used to DERIVE them, re-deriving nx's own defaults with
// its own `?? true` chains. That is a mirror of a private implementation, kept honest by a
// human rereading nx's source at every bump. It is gone. The values are READ from the config
// nx itself resolves, and the git operations happen here, once, exactly as nx's own
// top-level `release()` performs them.
//
// Why the git operations move here rather than staying with the changelog step: nx's
// changelog step commits `tree.listChanges()` through `commitChanges`, which THROWS on an
// empty list ("No changed files to commit"). A consumer on nx's default changelog config
// (`projectChangelogs` defaults to false) produces no changelog files, so that step has
// nothing to commit — and the version bumps, which are staged and very much real, would
// never be committed at all. nx's top-level command has the same problem and solves it the
// same way: pass gitCommit/gitTag false to both subcommands, let them STAGE, then commit
// what is staged with a plain `gitCommit`.
//
// Releasing and announcing stay SEPARATE operations. This writes a neutral record of what
// was released; the SBOM and announce steps read it and fail on their own. Nothing about
// notifications belongs in here — a message-shaped bug must never be able to break, or
// half-finish, an irreversible release.
//
// The record is written BEFORE publishing, and publishing is a separate call rather than
// part of a combined one that exits the process from within nx when a registry refuses.
// That order is the whole point: a failed publish leaves tags, Releases AND a record, so
// the announce job can be re-run on its own instead of dying with the process.
//
// ON THE `nx/src/...` IMPORTS. They are not a workaround: `./src/*` is a wildcard in nx's
// own `exports` map, types included, so these are resolvable, typed subpaths. They are
// nevertheless nx's internals, and that is the deliberate trade: what this file used to do
// was couple to those same internals by COPYING their behaviour, where a divergence is
// silent and lands in a consumer's trunk. Coupling to them by import makes the same
// divergence a red `typecheck` at the moment nx is bumped. Visible beats quiet.
import { createProjectGraphAsync } from '@nx/devkit';
import { readNxJson } from 'nx/src/config/nx-json';
import { createProjectFileMapUsingProjectGraph } from 'nx/src/project-graph/file-map-utils';
import {
  createNxReleaseConfig,
  handleNxReleaseConfigError,
  type ResolvedCreateRemoteReleaseProvider,
} from 'nx/src/command-line/release/config/config';
import {
  ReleaseVersion,
  createCommitMessageValues,
  createGitTagValues,
  handleDuplicateGitTags,
} from 'nx/src/command-line/release/utils/shared';
import {
  getCommitHash,
  gitCommit,
  gitPush,
  gitTag,
} from 'nx/src/command-line/release/utils/git';
import { createRemoteReleaseClient } from 'nx/src/command-line/release/utils/remote-release-clients/remote-release-client';
import { releaseChangelog, releasePublish, releaseVersion } from 'nx/release';
import { writeFileSync } from 'node:fs';
import { publishableProjects, toReleaseRecords } from './release-result.js';
import type {
  ProjectChangelogs,
  ProjectsVersionData,
} from './release-result.types.js';
import { isPackageTag } from './tags.js';
import { remoteReleaseProviderOf, tagsByProject } from './release-git.js';

const dryRun = process.env['RELEASE_DRY_RUN'] === 'true';
// Off by default — an nx release is loud enough — but reachable without editing a published
// package, which is what a CI operator needs at the moment a release misbehaves. It is also
// what makes nx print the git commands it is about to run (`gitCommit`/`gitTag` log the
// command only when verbose), so a rehearsal can be read rather than trusted.
const verbose = process.env['RELEASE_VERBOSE'] === 'true';

const projectGraph = await createProjectGraphAsync({ exitOnError: true });

// THE RESOLVED CONFIG, asked of nx instead of derived from nx.json. `nxReleaseConfig` is
// fully defaulted (nx types it `DeepRequired`), and it is also the validator: a consumer who
// mixes a top-level `release.git` with a granular `release.version.git`, or who disables the
// push while asking for a GitHub Release, is rejected HERE, by nx, with nx's own message —
// rather than being quietly accommodated by a script that guessed what they meant.
const { error: configError, nxReleaseConfig } = await createNxReleaseConfig(
  projectGraph,
  await createProjectFileMapUsingProjectGraph(projectGraph),
  readNxJson().release ?? {},
);
if (configError || !nxReleaseConfig) {
  // Prints nx's own diagnostic and exits the process; the throw below is unreachable and
  // exists only to tell TypeScript that nxReleaseConfig is non-null from here on.
  await handleNxReleaseConfigError(
    configError ?? { code: 'PROJECTS_AND_GROUPS_DEFINED', data: {} },
  );
  throw new Error('unreachable');
}

// The git behaviour of the TOP-LEVEL command, read rather than reproduced.
//
// `nxReleaseConfig.changelog.git` is exactly that: nx builds it from `changelogGitDefaults`
// (`commit: true`, `tag: true`, `push` on when any changelog config asks for a remote
// release) with the consumer's own `release.git` merged over it — which is, value for value,
// what the old `gitFlagsFor` re-derived by hand. Reading the field cannot drift from it.
//
// Guarded because nx's types say these may be absent while its implementation always fills
// them. Where the two disagree, this script trusts NEITHER silently: it fails, naming what
// was missing, rather than falling back to a default of its own invention — a default here is
// how the derivation crept in the first time.
const changelogConfig = nxReleaseConfig.changelog;
if (!changelogConfig?.git) {
  throw new Error(
    'nx-release: nx resolved a release config with no changelog.git section. ' +
      'Refusing to guess whether this release should commit, tag or push.',
  );
}
const git = changelogConfig.git;
const shouldCommit = git.commit;
const shouldTag = git.tag;
const shouldPush = git.push;
// The one value nx's top-level command computes rather than reads: staging is implied by
// committing (nx `release.js`). Written the same way, and it is a single `||`, not a policy.
const shouldStage = shouldCommit || nxReleaseConfig.git.stageChanges;

// Neither subcommand commits or tags: there is ONE commit and ONE tag per release, made
// below, after the changelog files exist. Passing all three explicitly is also what tells
// nx that the top-level command is driving (see the header) — so it is unconditional, and
// no longer depends on reading the consumer's config correctly.
//
// `gitPush: false` EXPLICITLY, and it is not symmetry with the two above. Leaving it out is
// not the same as saying no: nx falls back to the resolved `release.version.git`, which
// inherits the consumer's top-level `push` — so with `git.push: true` this step pushes right
// after staging the version bumps, before anything has been committed or tagged. Caught in a
// rehearsal, twice: once by the code this file replaced, and again here the day its `gitPush:
// false` was dropped on the way over. nx's own top-level command has the same gap; it just
// does not show on a config that leaves `push` unset.
const { workspaceVersion, projectsVersionData, releaseGraph } =
  await releaseVersion({
    dryRun,
    verbose,
    stageChanges: shouldStage,
    gitCommit: false,
    gitTag: false,
    gitPush: false,
  });

// NOTHING RELEASED — stop here, before the changelog step.
//
// `projectsVersionData` lists every project nx considered, most of them with no new
// version: a push that releases nothing is the ordinary case, not an error. Going on
// anyway hands `releaseChangelog` a run with nothing to describe, and then asks it to tag
// and push — reported from a consumer repo as a junk tag on a push that released nothing.
// The record is still written (empty), because "nothing was released" and "the step never
// ran" must not look the same to whatever reads it next.
const releasedAnything = Object.values(projectsVersionData ?? {}).some(
  (data) => data?.newVersion,
);

if (!releasedAnything) {
  writeFileSync(
    process.env['RELEASE_RESULT_FILE'] ?? 'release-result.json',
    `${JSON.stringify({ dryRun, releases: [] }, null, 2)}\n`,
  );
  writeFileSync(process.env['NEW_TAGS_FILE'] ?? 'new_tags.txt', '');
  console.log(
    'nx-release: no project has a new version — nothing to changelog, tag or publish.',
  );
  process.exit(0);
}

// The changelog step runs on the CONSUMER'S OWN configuration, untouched. Whoever configured
// changelog files and GitHub Releases gets them; whoever did not, does not — this script no
// longer has an opinion, because it no longer needs anything back from this step in order to
// know the tag. (It used to: an earlier version overrode the config to force per-project
// changelog generation, purely to read `releaseVersion.gitTag` out of the result. The tag is
// now formed by nx's own `ReleaseVersion` from the resolved tag pattern, so the override and
// everything that propped it up are deleted.)
//
// git and the remote release are OURS, hence four falses: the commit, the tag and the push
// happen once, below, and the remote release after them — a hosted release must point at the
// pushed commit, and this step would otherwise create it against the pre-release SHA.
const { projectChangelogs, workspaceChangelog } = await releaseChangelog({
  // Passed as the CLI passes it: in a fixed/single-group workspace the changelog step
  // needs the workspace version, and leaving it out lets that step decide for itself.
  version: workspaceVersion,
  dryRun,
  verbose,
  versionData: projectsVersionData,
  releaseGraph,
  stageChanges: shouldStage,
  gitCommit: false,
  gitTag: false,
  gitPush: false,
  createRelease: false,
});

// The tags nx would cut, formed by nx's own function from the resolved patterns — including
// the fixed-group case, which cuts ONE tag for a whole set rather than one per project.
const gitTagValues = createGitTagValues(
  releaseGraph.releaseGroups,
  releaseGraph.releaseGroupToFilteredProjects,
  projectsVersionData,
);
handleDuplicateGitTags(gitTagValues);

// The per-project mapping the record needs, formed by nx's own `ReleaseVersion` (which also
// applies nx's project-name sanitisation). Cross-checked against the flat list above: two
// independent answers out of the same source, and a disagreement means nx changed something
// underneath — which must stop the release, not be recorded as fact.
//
// THE PATTERN IS READ FROM THE CONFIG, NOT FROM THE GRAPH, and that is not a stylistic
// preference. nx's `createGitTagValues` takes it off the release group object at runtime
// (`releaseGroup.releaseTag.pattern`), but the published type of `ReleaseGroupWithName` does
// not declare it — implementation and types disagree, and going that way costs a cast, in the
// one place a cast hurts most. The resolved config declares the same field on the same group,
// typed, and the graph will name the group a project belongs to. So: ask the graph WHICH
// group, ask the config WHAT PATTERN. No cast, and both halves stay checked.
const tagByProject = tagsByProject(
  projectsVersionData as ProjectsVersionData,
  {
    getReleaseGroupForProject: (project) => {
      const name = releaseGraph.getReleaseGroupNameForProject(project);
      if (!name) return undefined;
      const pattern = nxReleaseConfig.groups?.[name]?.releaseTag?.pattern;
      if (!pattern) {
        throw new Error(
          `nx-release: the release group "${name}" resolved with no releaseTag.pattern, so ` +
            `there is nothing to form ${project}'s tag from.`,
        );
      }
      return { name, releaseTag: { pattern } };
    },
  },
  ReleaseVersion,
  new Set(gitTagValues),
);

const records = toReleaseRecords(
  (projectsVersionData ?? {}) as ProjectsVersionData,
  tagByProject,
  (projectChangelogs ?? {}) as ProjectChangelogs,
);

// ONE commit, for everything both steps staged — the version bumps AND whatever changelog
// files the consumer's config produced. A plain `gitCommit` of what is staged, deliberately
// NOT nx's `commitChanges`: that one re-stages a file list and throws when the list is empty,
// which is the default-changelog-config case (see the header).
//
// The three banners below are not decoration. nx's subcommands used to print them on the way
// past, and taking the git operations over here took the log with it: `gitCommit`/`gitTag`
// say nothing unless verbose, so without these a CI operator reading a release job could not
// tell a commit that happened from one that was configured away.
let latestCommit: string | undefined;
if (shouldCommit) {
  console.log(
    dryRun ? '[dry run] would commit the release' : 'Committing the release',
  );
  await gitCommit({
    messages: createCommitMessageValues(
      releaseGraph.releaseGroups,
      releaseGraph.releaseGroupToFilteredProjects,
      projectsVersionData,
      nxReleaseConfig.git.commitMessage,
    ),
    additionalArgs: nxReleaseConfig.git.commitArgs,
    dryRun,
    verbose,
  });
  if (!dryRun) latestCommit = await getCommitHash('HEAD');
}

if (shouldTag) {
  console.log(
    `${dryRun ? '[dry run] would tag' : 'Tagging'}: ${gitTagValues.join(', ')}`,
  );
  for (const tag of gitTagValues) {
    await gitTag({
      tag,
      message: nxReleaseConfig.git.tagMessage,
      additionalArgs: nxReleaseConfig.git.tagArgs,
      dryRun,
      verbose,
    });
  }
}

if (shouldPush) {
  console.log(
    dryRun
      ? '[dry run] would push the release to origin'
      : 'Pushing the release to origin',
  );
  await gitPush({
    dryRun,
    verbose,
    additionalArgs: nxReleaseConfig.git.pushArgs,
  });
}

// The remote releases, after the push — a hosted release can only point at a commit the
// remote has. Only for the changelog configs that asked for one; a consumer who configured
// none gets none, and nothing here decides that on their behalf. Skipped entirely on a
// rehearsal: there is no commit to point at, and nx's own client would still call the API.
if (!dryRun) {
  latestCommit ??= await getCommitHash('HEAD');

  // The provider comes back as `unknown` from the helper — which keeps that helper free of
  // nx's types and testable — so it is cast once, here, to the parameter nx declares.
  const clientFor = (provider: unknown) =>
    createRemoteReleaseClient(provider as ResolvedCreateRemoteReleaseProvider);

  const workspaceProvider = remoteReleaseProviderOf(
    changelogConfig.workspaceChangelog,
  );
  if (workspaceChangelog && workspaceProvider) {
    const client = await clientFor(workspaceProvider);
    await client?.createOrUpdateRelease(
      workspaceChangelog.releaseVersion,
      workspaceChangelog.contents,
      latestCommit,
      { dryRun },
    );
  }

  if (projectChangelogs) {
    for (const group of releaseGraph.releaseGroups) {
      const provider = remoteReleaseProviderOf(group.changelog);
      if (!provider) continue;
      const client = await clientFor(provider);
      for (const project of group.projects) {
        const changelog = projectChangelogs[project];
        if (!changelog) continue;
        await client?.createOrUpdateRelease(
          changelog.releaseVersion,
          changelog.contents,
          latestCommit,
          { dryRun },
        );
      }
    }
  }
}

const resultFile = process.env['RELEASE_RESULT_FILE'] ?? 'release-result.json';
writeFileSync(
  resultFile,
  `${JSON.stringify({ dryRun, releases: records }, null, 2)}\n`,
);

// Transitional: the current SBOM/announce bricks still read a flat list of package tags.
// Projected from the same verified records, so the two files cannot disagree — and left
// EMPTY on a rehearsal, because those tags do not exist yet and a downstream step handed
// one would announce a release that never happened. Deduplicated: a fixed release group
// cuts one tag for its whole set, and two identical lines are two Slack messages.
const packageTags = dryRun
  ? []
  : [...new Set(records.map((r) => r.tag).filter(isPackageTag))];
writeFileSync(
  process.env['NEW_TAGS_FILE'] ?? 'new_tags.txt',
  packageTags.length ? `${packageTags.join('\n')}\n` : '',
);

// Publish LAST, and only now — the record is already on disk, so a registry that refuses
// leaves a failed job with a full account of what was released, and the announce job can
// be re-run on its own instead of being lost with the process.
//
// And only if there IS something publishable. `releasePublish` throws when none of the
// projects it matched has the `nx-release-publish` target, which @nx/js does not create for
// a `private` package — so a repo that versions and tags a private deliverable (a blog, an
// app) would see its release blow up AFTER tagging, on a step it never wanted. Reported from
// another repo doing exactly that.
const publishable = publishableProjects(records, projectGraph.nodes as never);

if (publishable.length === 0 && records.length > 0) {
  console.log(
    `nx-release: nothing to publish (${records.length} released project(s), none with an nx-release-publish target — private packages do not get one). Skipping publish.`,
  );
}

if (publishable.length > 0) {
  const publishResults = await releasePublish({
    dryRun,
    versionData: projectsVersionData,
    releaseGraph,
  });
  const allOk = Object.values(publishResults).every(
    (result) => result.code === 0,
  );
  if (!allOk) {
    console.error(
      'nx-release: a package failed to publish. The tags, the Releases and the record all stand — fix the registry problem and re-run only what failed.',
    );
    process.exitCode = 1;
  }
}

const others = records.filter((r) => !isPackageTag(r.tag)).map((r) => r.tag);
console.log(
  `${dryRun ? '[dry run] would release' : 'Released'}: ${
    records.map((r) => r.tag).join(', ') || '(nothing)'
  }`,
);
console.log(`New package tags: ${packageTags.join(', ') || '(none)'}`);
console.log(`Other new tags: ${others.join(', ') || '(none)'}`);
if (dryRun) console.log(`Rehearsal: no tags written to NEW_TAGS_FILE.`);

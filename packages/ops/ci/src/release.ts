#!/usr/bin/env node
// The CI release entrypoint: run the release, then say what it did.
//
// Every fact is HANDED OVER by nx, never reconstructed: the versions, the tags as nx formed
// them, and the release notes as nx rendered them. What this replaced, in order: a
// photograph of the git tags before and after shelling out to the CLI; then a mirror of
// nx's own tag interpolation, checked against git because a mirror cannot be trusted; and,
// for a moment, a GitHub API round trip to read back the changelog nx had just written.
// Each one was a way of asking downstream what was already known upstream.
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
import {
  createProjectGraphAsync,
  readJsonFile,
  workspaceRoot,
} from '@nx/devkit';
import { releaseChangelog, releasePublish, releaseVersion } from 'nx/release';
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { publishableProjects, toReleaseRecords } from './release-result.js';
import type {
  ProjectChangelogs,
  ProjectsVersionData,
} from './release-result.types.js';
import { isPackageTag } from './tags.js';
import { gitFlagsFor } from './git-flags.js';
import type { ReleaseGitConfig } from './git-flags.types.js';

const dryRun = process.env['RELEASE_DRY_RUN'] === 'true';

function readReleaseConfig(): ReleaseGitConfig | undefined {
  const path = join(workspaceRoot, 'nx.json');
  if (!existsSync(path)) return undefined;
  return (readJsonFile(path) as { release?: ReleaseGitConfig }).release;
}

// The three subcommands, in nx's own order, instead of the combined `release()`.
//
// This is what makes nx HAND OVER the tag and the release notes rather than us
// reconstructing them: `releaseVersion` returns the versions, `releaseChangelog` returns
// each project's `gitTag` and the rendered `contents` — the same text it writes into the
// GitHub Release. Asking GitHub for that text afterwards would be asking it to give back
// what nx produced in this very process.
//
// The explicit git flags are not decoration: both subcommands refuse to run beside a
// top-level `release.git` UNLESS gitCommit, gitTag and stageChanges are all passed — that is
// how nx tells the subcommand API apart from the `nx release` CLI, which owns them itself.
//
// They are READ FROM THE CONSUMER'S nx.json, never chosen here. Passing our own values was a
// real defect, reported from a consumer that deliberately keeps `release.git.commit: false`:
// a hardcoded `gitCommit: true` overrode it, their rehearsal died with "No changed files to
// commit", and a real run would have started pushing bump commits to their trunk. A published
// release script may decide the ORDER of the steps; it may not decide whether somebody else's
// trunk receives commits.
// Read straight from nx.json rather than through devkit's `readNxJson`, which takes a
// generator Tree this process does not have. `readJsonFile` tolerates the comments nx allows.
const releaseConfig = readReleaseConfig();

const versionGit = gitFlagsFor('version', releaseConfig);
const changelogGit = gitFlagsFor('changelog', releaseConfig);

const { workspaceVersion, projectsVersionData, releaseGraph } =
  await releaseVersion({
    dryRun,
    verbose: false,
    ...versionGit,
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

const { projectChangelogs } = await releaseChangelog({
  // Passed as the CLI passes it: in a fixed/single-group workspace the changelog step
  // needs the workspace version, and leaving it out lets that step decide for itself.
  version: workspaceVersion,
  dryRun,
  verbose: false,
  versionData: projectsVersionData,
  releaseGraph,
  ...changelogGit,
});

const records = toReleaseRecords(
  (projectsVersionData ?? {}) as ProjectsVersionData,
  (projectChangelogs ?? {}) as ProjectChangelogs,
);

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
const graph = await createProjectGraphAsync();
const publishable = publishableProjects(records, graph.nodes as never);

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

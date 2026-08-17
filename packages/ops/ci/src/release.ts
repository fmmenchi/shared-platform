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
import { releaseChangelog, releasePublish, releaseVersion } from 'nx/release';
import { writeFileSync } from 'node:fs';
import { toReleaseRecords } from './release-result.js';
import type {
  ProjectChangelogs,
  ProjectsVersionData,
} from './release-result.types.js';
import { isPackageTag } from './tags.js';

const dryRun = process.env['RELEASE_DRY_RUN'] === 'true';

// The three subcommands, in nx's own order, instead of the combined `release()`.
//
// This is what makes nx HAND OVER the tag and the release notes rather than us
// reconstructing them: `releaseVersion` returns the versions, `releaseChangelog` returns
// each project's `gitTag` and the rendered `contents` — the same text it writes into the
// GitHub Release. Asking GitHub for that text afterwards would be asking it to give back
// what nx produced in this very process.
//
// The explicit git flags are not decoration: both subcommands refuse to run beside a
// top-level `release.git` UNLESS gitCommit, gitTag and stageChanges are all passed. Passing
// them keeps `nx release` (the CLI) working for maintainers, and reproduces today's
// behaviour exactly — no commit, tag and push once, at the changelog step.
const gitFlags = { gitCommit: false, stageChanges: false } as const;

const { projectsVersionData, releaseGraph } = await releaseVersion({
  dryRun,
  verbose: false,
  ...gitFlags,
  gitTag: false, // the changelog step tags, as it does under `nx release`
});

const { projectChangelogs } = await releaseChangelog({
  dryRun,
  verbose: false,
  versionData: projectsVersionData,
  releaseGraph,
  ...gitFlags,
  gitTag: true,
  gitPush: true,
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
if (records.length > 0) {
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

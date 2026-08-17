#!/usr/bin/env node
// The CI release entrypoint: run the release, then say what it did.
//
// The facts come from nx's own programmatic API (`nx/release`), not from a photograph of
// the git tags taken before and after shelling out to the CLI. nx is the one that decides
// which projects release, at which version and under which tag pattern — asking it is
// exact, while reconstructing the answer afterwards was a guess that had to encode the
// tag convention (`{project}@{version}`) in a regex, and got it wrong for any workspace
// that tags differently.
//
// Releasing and announcing stay SEPARATE operations. This writes a neutral record of what
// was released; the SBOM and announce steps read it and fail on their own. Nothing about
// notifications belongs in here — a message-shaped bug must never be able to break, or
// half-finish, an irreversible release.
//
// NOT written when nx itself fails: `release()` calls `process.exit(1)` internally on a
// publish error, so a run that tagged and published but then died leaves no record at all.
// That is a real hole, and it is the reason the record must never be treated as "the
// release did not happen" — only as "here is what it did, when it got this far".
import { release } from 'nx/release';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { assertReleaseGroups, toReleaseRecords } from './release-result.js';
import type { ProjectsVersionData } from './release-result.types.js';
import { isPackageTag } from './tags.js';

/** `true` when the tag exists in this repository — evidence, not prediction. */
const tagExists = (tag: string): boolean => {
  try {
    execFileSync('git', ['rev-parse', '-q', '--verify', `refs/tags/${tag}`], {
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
};

const dryRun = process.env['RELEASE_DRY_RUN'] === 'true';

const { projectsVersionData, releaseGraph } = await release({
  // CI has nobody to answer a prompt.
  yes: true,
  verbose: false,
  // Rehearsable: `RELEASE_DRY_RUN=true` runs the whole script without cutting anything.
  // A release entrypoint you cannot run without releasing is one you only ever test in
  // production. It writes NO consumable output — see below.
  dryRun,
});

// Checked at runtime, because it cannot be checked at compile time: nx's own type for a
// release group does not declare `projects`, so any typed handshake here is a cast.
const records = toReleaseRecords(
  (projectsVersionData ?? {}) as ProjectsVersionData,
  assertReleaseGroups(releaseGraph?.releaseGroups ?? []),
);

// The tags are FORMED from nx's patterns, which mirrors logic that lives inside nx — so
// they are checked against the tags git really has. A mismatch means our mirror drifted
// from nx, and the only safe outcome is a loud one: announcing a tag that does not exist
// posts about a release nobody cut, and uploads an SBOM to nothing.
if (!dryRun) {
  const missing = records.filter((r) => !tagExists(r.tag));
  if (missing.length) {
    throw new Error(
      `nx-release: ${missing.length} tag(s) were formed but do not exist in git: ` +
        `${missing.map((r) => r.tag).join(', ')}. The release ran; the record was not written.`,
    );
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

const others = records.filter((r) => !isPackageTag(r.tag)).map((r) => r.tag);
console.log(
  `${dryRun ? '[dry run] would release' : 'Released'}: ${
    records.map((r) => r.tag).join(', ') || '(nothing)'
  }`,
);
console.log(`New package tags: ${packageTags.join(', ') || '(none)'}`);
console.log(`Other new tags: ${others.join(', ') || '(none)'}`);
if (dryRun) console.log(`Rehearsal: no tags written to NEW_TAGS_FILE.`);

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
import { release } from 'nx/release';
import { writeFileSync } from 'node:fs';
import { toReleaseRecords } from './release-result.js';
import type {
  ProjectsVersionData,
  ReleaseGroupSummary,
} from './release-result.types.js';
import { isPackageTag } from './tags.js';

const { projectsVersionData, releaseGraph } = await release({
  // CI has nobody to answer a prompt.
  yes: true,
  verbose: false,
  // Rehearsable: `RELEASE_DRY_RUN=true` runs the whole script — including both file
  // writes — without cutting anything. A release entrypoint you cannot run without
  // releasing is one you only ever test in production.
  dryRun: process.env['RELEASE_DRY_RUN'] === 'true',
});

const records = toReleaseRecords(
  (projectsVersionData ?? {}) as ProjectsVersionData,
  (releaseGraph?.releaseGroups ?? []) as unknown as ReleaseGroupSummary[],
);

// Always written, even empty: "nothing was released" and "the release step never got
// here" must not look the same to whatever reads this next.
writeFileSync(
  process.env['RELEASE_RESULT_FILE'] ?? 'release-result.json',
  `${JSON.stringify(records, null, 2)}\n`,
);

// Transitional: the current SBOM/announce bricks still read a flat list of package tags.
// Same records, projected — so the two files can never disagree with each other.
const packageTags = records.map((r) => r.tag).filter(isPackageTag);
writeFileSync(
  process.env['NEW_TAGS_FILE'] ?? 'new_tags.txt',
  packageTags.length ? `${packageTags.join('\n')}\n` : '',
);

const others = records.filter((r) => !isPackageTag(r.tag)).map((r) => r.tag);
console.log(`Released: ${records.map((r) => r.tag).join(', ') || '(nothing)'}`);
console.log(`New package tags: ${packageTags.join(', ') || '(none)'}`);
console.log(`Other new tags: ${others.join(', ') || '(none)'}`);

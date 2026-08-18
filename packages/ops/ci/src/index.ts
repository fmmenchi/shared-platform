// The reusable API behind the CI release orchestrator (src/release.ts is the
// node entrypoint the workflow runs; these are its testable pieces).
export { isPackageTag, newTags } from './tags.js';
export { toReleaseRecords } from './release-result.js';
export type {
  ProjectChangelogs,
  ProjectsVersionData,
  ReleaseRecord,
} from './release-result.types.js';

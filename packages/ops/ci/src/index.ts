// The reusable API behind the CI release orchestrator (src/release.ts is the
// node entrypoint the workflow runs; these are its testable pieces).
export { majorAlias } from './alias.js';
export { isPackageTag, newTags } from './tags.js';
export { formatTag, toReleaseRecords } from './release-result.js';
export type {
  ProjectsVersionData,
  ReleaseGroupSummary,
  ReleaseRecord,
} from './release-result.types.js';

// The reusable API behind the CI release orchestrator (src/release.ts is the
// node entrypoint the workflow runs; these are its testable pieces).
//
// `newTags(before, after)` is gone from here. It diffed a photograph of the git tags taken
// before the release against one taken after — the very first way this package answered
// "what was released", deleted years of scars ago and still exported to nobody: no caller in
// this workspace, none in a consumer. Reading tags back out of git cannot say which project
// a tag belongs to (`gh-actions/v0.4.0` has no project name in it), cannot work on a
// rehearsal, and re-derives what `projectsVersionData` already states. Keeping the corpse
// exported made it look like a supported alternative. It was not.
export { isPackageTag } from './tags.js';
export { publishableProjects, toReleaseRecords } from './release-result.js';
export { remoteReleaseProviderOf, tagsByProject } from './release-git.js';
export type {
  ProjectChangelogs,
  ProjectsVersionData,
  ReleaseRecord,
} from './release-result.types.js';
export type {
  ReleaseGroupTagConfig,
  ReleaseVersionCtor,
  ReleaseVersionCtorArg,
  RemoteReleaseConfig,
  TagPatternSource,
} from './release-git.types.js';

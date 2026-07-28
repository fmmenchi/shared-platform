/**
 * THE commit-type vocabulary — single source of truth, consumed by every
 * enforcement point so they can never drift:
 *
 * - `commitlint.config.mjs` (the `type-enum` rule, commit-msg hook)
 * - `tools/commit/check-branch-name.mjs` (the pre-push branch-name gate)
 *
 * Conventional Commits drive `nx release` (feat→minor, fix→patch, breaking→
 * major, everything else→no release), so adding a type here is a release-
 * policy decision, not a formatting one.
 */
export const COMMIT_TYPES = [
  'build',
  'chore',
  'ci',
  'docs',
  'feat',
  'fix',
  'perf',
  'refactor',
  'revert',
  'style',
  'test',
];

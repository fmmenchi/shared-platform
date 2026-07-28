import { COMMIT_TYPES } from './tools/commit/types.mjs';

export default {
  extends: ['@commitlint/config-conventional'],
  // The type list comes from the shared vocabulary (tools/commit/types.mjs),
  // the same one the pre-push branch-name gate uses — one source, no drift.
  rules: { 'type-enum': [2, 'always', COMMIT_TYPES] },
};

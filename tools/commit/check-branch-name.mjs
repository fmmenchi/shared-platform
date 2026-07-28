/**
 * Pre-push gate: the branch name must be `main` or `<type>/<kebab-description>`
 * where `<type>` comes from the SAME vocabulary commitlint enforces
 * (`tools/commit/types.mjs`) — one list, zero drift between the hooks.
 * Invoked by `.husky/pre-push`.
 */
import { execSync } from 'node:child_process';

import { COMMIT_TYPES } from './types.mjs';

const branch =
  process.argv[2] ??
  execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();

const pattern = new RegExp(
  `^(main|(${COMMIT_TYPES.join('|')})/[a-z0-9._/-]+)$`,
);

if (!pattern.test(branch)) {
  console.error(`✖ Branch "${branch}" is not semantic.`);
  console.error(
    '  Use <type>/<short-description> (kebab-case), ending with the issue number when one exists,',
  );
  console.error('  e.g. feat/prompt-registry-42, fix/api-client-timeout.');
  console.error(`  Allowed types: ${COMMIT_TYPES.join(' ')}`);
  process.exit(1);
}

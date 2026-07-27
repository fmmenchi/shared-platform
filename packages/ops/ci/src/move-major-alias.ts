// Moves a moving-major tag alias (ALIAS_PREFIX, default gh-actions/v) to the latest
// exact <prefix>X.Y.Z tag. Idempotent: a no-op when the alias already points there,
// so it can run on every release. The version-parsing logic is in ./alias (tested).
import { execSync } from 'node:child_process';
import { majorAlias } from './alias.js';

const git = (args: string): string =>
  execSync(`git ${args}`, { encoding: 'utf8' }).trim();

const prefix = process.env['ALIAS_PREFIX'] ?? 'gh-actions/v';
const tags = git('tag -l').split('\n').filter(Boolean);

const found = majorAlias(tags, prefix);
if (!found) {
  console.log(`No ${prefix}X.Y.Z release tag yet.`);
  process.exit(0);
}

const { alias, target } = found;
let current = '';
try {
  current = git(`rev-parse -q --verify refs/tags/${alias}`);
} catch {
  /* the alias doesn't exist yet — create it below */
}

if (current && current === git(`rev-parse ${target}`)) {
  console.log(`${alias} already at ${target}.`);
  process.exit(0);
}

git(`tag -f ${alias} ${target}`);
git(`push -f origin ${alias}`);
console.log(`Moved ${alias} → ${target}`);

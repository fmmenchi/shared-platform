// The CI release orchestrator (run via node from dist). Resolves the base, releases
// the affected releasable projects, and writes the newly-created PACKAGE tags to
// NEW_TAGS_FILE for the downstream SBOM + announce steps. Toolkit tags (e.g.
// gh-actions/v*) are logged but kept out — the toolkit has its own alias handling.
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { affectedReleasable } from './releasable.js';
import { isPackageTag, newTags } from './tags.js';

const git = (args: string): string =>
  execSync(`git ${args}`, { encoding: 'utf8' });
const allTags = (): string[] => git('tag -l').split('\n').filter(Boolean);

// The workflow passes github.event.before; an all-zero SHA (first push to a branch)
// has no parent range, so fall back to the merge's first parent.
function resolveBase(): string {
  const before = process.env['BASE_REF'] ?? '';
  return /[^0]/.test(before) ? before : git('rev-parse HEAD~1').trim();
}

const base = resolveBase();
const head = process.env['HEAD'] ?? 'HEAD';
const projects = affectedReleasable(base, head);

const before = allTags();
if (projects.length === 0) {
  console.log('No releasable project affected — nothing to release.');
} else {
  console.log(`Releasing affected projects: ${projects.join(',')}`);
  execSync(`pnpm nx release --yes --projects="${projects.join(',')}"`, {
    stdio: 'inherit',
  });
}

const created = newTags(before, allTags());
const packageTags = created.filter(isPackageTag);
const toolkitTags = created.filter((t) => !isPackageTag(t));

writeFileSync(
  process.env['NEW_TAGS_FILE'] ?? 'new_tags.txt',
  packageTags.length ? `${packageTags.join('\n')}\n` : '',
);
console.log(`New package tags: ${packageTags.join(', ') || '(none)'}`);
console.log(`Other new tags: ${toolkitTags.join(', ') || '(none)'}`);

// The CI release entrypoint: run `nx release` (which versions ONLY the projects with
// releasing conventional commits — nx does the right thing on its own, no affected
// pre-filter needed) and write the newly-created PACKAGE tags to NEW_TAGS_FILE for the
// downstream SBOM + announce steps. Toolkit tags (e.g. gh-actions/v*) are logged but
// kept out — the toolkit has its own alias handling.
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { isPackageTag, newTags } from './tags.js';

const git = (args: string): string =>
  execSync(`git ${args}`, { encoding: 'utf8' });
const allTags = (): string[] => git('tag -l').split('\n').filter(Boolean);

const before = allTags();
execSync('pnpm nx release --yes', { stdio: 'inherit' });

const created = newTags(before, allTags());
const packageTags = created.filter(isPackageTag);
const toolkitTags = created.filter((t) => !isPackageTag(t));

writeFileSync(
  process.env['NEW_TAGS_FILE'] ?? 'new_tags.txt',
  packageTags.length ? `${packageTags.join('\n')}\n` : '',
);
console.log(`New package tags: ${packageTags.join(', ') || '(none)'}`);
console.log(`Other new tags: ${toolkitTags.join(', ') || '(none)'}`);

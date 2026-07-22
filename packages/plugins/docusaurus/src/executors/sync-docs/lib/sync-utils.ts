import {
  cpSync,
  existsSync,
  rmSync,
  watch,
  writeFileSync,
  type FSWatcher,
} from 'node:fs';
import { join } from 'node:path';
import { logger } from '@nx/devkit';

import { docsFolder } from '../../../shared/constants';
import type {
  DocusaurusProjectsConfig,
  NxProjectDocEntry,
} from '../../../shared/types';

export type Category = 'libraries' | 'plugins';

/**
 * Writes the `.gitignore` that keeps the assembled per-package folders out of git — they are
 * rebuilt from each package's `docs/` on every sync, so committing them would duplicate the
 * source. The `_category_.json` sidebar markers live one level up and stay tracked. Owning
 * this here means the ignore travels with the tool, not a hand-edited root `.gitignore`.
 */
export function writeAggregationGitignore(targetRoot: string): void {
  writeFileSync(
    join(targetRoot, '.gitignore'),
    [
      '# Assembled at build time by @fmmenchi/nx-docusaurus (sync-docs) — not committed.',
      '# Each package folder is a copy of that package’s docs/; the _category_.json markers stay.',
      'libraries/*/',
      'plugins/*/',
      '',
    ].join('\n'),
  );
}

/**
 * Copies one project's `docs/` into `<targetRoot>/<category>/<folder>`, replacing whatever
 * was there. A project without a `docs/` folder is silently skipped.
 */
export function syncSingleProject(
  workspaceRoot: string,
  targetRoot: string,
  category: Category,
  project: NxProjectDocEntry,
): void {
  const source = join(workspaceRoot, project.root, docsFolder);
  const destination = join(targetRoot, category, project.folder);
  try {
    if (!existsSync(source)) return;
    rmSync(destination, { recursive: true, force: true });
    cpSync(source, destination, { recursive: true });
    logger.info(`Synced [${category}] ${project.name}`);
  } catch (err) {
    logger.error(`Failed to sync ${project.name}: ${(err as Error).message}`);
  }
}

/** Initial one-shot sync of every project in the manifest. */
export function syncAllProjects(
  workspaceRoot: string,
  targetRoot: string,
  config: DocusaurusProjectsConfig,
): void {
  config.libraries.forEach((p) =>
    syncSingleProject(workspaceRoot, targetRoot, 'libraries', p),
  );
  config.plugins.forEach((p) =>
    syncSingleProject(workspaceRoot, targetRoot, 'plugins', p),
  );
}

function watchProject(
  workspaceRoot: string,
  targetRoot: string,
  category: Category,
  project: NxProjectDocEntry,
): FSWatcher | undefined {
  const source = join(workspaceRoot, project.root, docsFolder);
  if (!existsSync(source)) return undefined;
  return watch(source, { recursive: true }, () =>
    syncSingleProject(workspaceRoot, targetRoot, category, project),
  );
}

/** A watcher per project that has docs; re-syncs that project on any change. */
export function watchAllProjects(
  workspaceRoot: string,
  targetRoot: string,
  config: DocusaurusProjectsConfig,
): FSWatcher[] {
  const forCategory = (category: Category, projects: NxProjectDocEntry[]) =>
    projects
      .map((p) => watchProject(workspaceRoot, targetRoot, category, p))
      .filter((w): w is FSWatcher => w !== undefined);
  return [
    ...forCategory('libraries', config.libraries),
    ...forCategory('plugins', config.plugins),
  ];
}

import { cpSync, existsSync, rmSync, watch, type FSWatcher } from 'node:fs';
import { join } from 'node:path';
import { logger } from '@nx/devkit';

import { docsFolder } from '../../../shared/constants';
import type {
  DocusaurusProjectsConfig,
  NxProjectDocEntry,
} from '../../../shared/types';

export type Category = 'libraries' | 'plugins';

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

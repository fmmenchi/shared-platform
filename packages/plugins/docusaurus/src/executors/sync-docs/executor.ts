import type { ExecutorContext } from '@nx/devkit';
import { logger } from '@nx/devkit';
import { existsSync, mkdirSync, readFileSync, type FSWatcher } from 'node:fs';
import { join } from 'node:path';

import { configFileName } from '../../shared/constants';
import type { DocusaurusProjectsConfig } from '../../shared/types';
import {
  syncAllProjects,
  watchAllProjects,
  writeAggregationGitignore,
} from './lib/sync-utils';
import type { SyncDocsExecutorSchema } from './schema';

/**
 * Assembles the docs site from each project's `docs/` folder.
 *
 * Reads the manifest `config-generator` wrote, copies every listed project's docs into
 * `<targetPath>/{libraries,plugins}/<folder>`, then yields success to unblock the build.
 * Also writes the `.gitignore` that keeps those assembled folders out of git — they are
 * rebuilt on every sync. A continuous **watch** mode (for the dev server) re-syncs on change.
 *
 * An async generator so it works as an Nx continuous executor (`yield { success }`).
 */
export default async function* syncDocsExecutor(
  options: SyncDocsExecutorSchema,
  context: ExecutorContext,
): AsyncGenerator<{ success: boolean }> {
  const { projectName, projectsConfigurations, root: workspaceRoot } = context;
  if (!projectName) {
    throw new Error('sync-docs must run in a project context.');
  }

  const projectRoot = projectsConfigurations.projects[projectName].root;
  const configPath = join(workspaceRoot, projectRoot, configFileName);
  if (!existsSync(configPath)) {
    throw new Error(
      `Manifest missing at ${configPath} — run config-generator first.`,
    );
  }
  const config = JSON.parse(
    readFileSync(configPath, 'utf-8'),
  ) as DocusaurusProjectsConfig;

  const targetRoot = join(workspaceRoot, options.targetPath);
  mkdirSync(targetRoot, { recursive: true });
  writeAggregationGitignore(targetRoot);

  syncAllProjects(workspaceRoot, targetRoot, config);
  yield { success: true };

  if (!options.watch) return;

  logger.info('sync-docs: watching for documentation changes…');
  let watchers: FSWatcher[] = [];
  try {
    await new Promise<void>((resolve) => {
      watchers = watchAllProjects(workspaceRoot, targetRoot, config);
      process.on('SIGINT', () => resolve());
      process.on('SIGTERM', () => resolve());
    });
  } finally {
    watchers.forEach((w) => w.close());
  }
}

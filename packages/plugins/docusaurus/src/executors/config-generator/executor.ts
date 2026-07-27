import type { PromiseExecutor } from '@nx/devkit';
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { configFileName, docsFolder } from '../../shared/constants';
import type {
  DocumentationType,
  DocusaurusProjectsConfig,
  NxProjectDocEntry,
} from '../../shared/types';
import type { ConfigGeneratorExecutorSchema } from './schema';

/**
 * Discovers which projects opt into the docs site — those that ship a `docs/` folder
 * with at least one `.md`/`.mdx` (or a `_category_.json`) — and writes the manifest
 * `nx-doc-projects.json` in the docs app root. `sync-docs` reads it to know what to copy.
 *
 * Categorization by tag: `scope:plugins` → plugin, `scope:ops` → ops, otherwise a library.
 * The docs app itself is skipped. The destination folder is the unscoped project name
 * (`@fmmenchi/notify` → `notify`) so it is unique and clean.
 */
const runExecutor: PromiseExecutor<ConfigGeneratorExecutorSchema> = async (
  _options,
  context,
) => {
  if (!context?.projectName) {
    throw new Error('config-generator must run in a project context.');
  }
  const { projectName: docProject, projectsConfigurations, root } = context;
  const projects = projectsConfigurations.projects;
  const docRoot = projects[docProject].root;

  const result: DocusaurusProjectsConfig = {
    libraries: [],
    plugins: [],
    ops: [],
  };

  for (const [name, cfg] of Object.entries(projects)) {
    if (cfg.root === docRoot) continue; // never sync the docs app into itself
    if (cfg.projectType === 'application') continue; // no apps here, but be explicit

    const docsPath = join(root, cfg.root, docsFolder);
    if (!existsSync(docsPath)) continue;
    const hasContent =
      existsSync(join(docsPath, '_category_.json')) ||
      readdirSync(docsPath).some(
        (f) => f.endsWith('.md') || f.endsWith('.mdx'),
      );
    if (!hasContent) continue;

    const tags = cfg.tags ?? [];
    const type: DocumentationType = tags.includes('scope:plugins')
      ? 'plugin'
      : tags.includes('scope:ops')
        ? 'ops'
        : 'library';
    const entry: NxProjectDocEntry = {
      name,
      root: cfg.root,
      folder: name.split('/').pop() as string,
      type,
    };
    const bucket =
      type === 'plugin'
        ? result.plugins
        : type === 'ops'
          ? result.ops
          : result.libraries;
    bucket.push(entry);
  }

  const outputPath = join(root, docRoot, configFileName);
  writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf-8');
  console.log(
    `Wrote ${configFileName}: ${result.libraries.length} libraries, ${result.plugins.length} plugins, ${result.ops.length} ops.`,
  );

  return { success: true };
};

export default runExecutor;

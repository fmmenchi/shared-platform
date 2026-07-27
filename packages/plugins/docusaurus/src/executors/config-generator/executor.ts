import type { PromiseExecutor } from '@nx/devkit';
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { configFileName, docsFolder } from '../../shared/constants';
import type {
  DocusaurusProjectsConfig,
  NxProjectDocEntry,
} from '../../shared/types';
import type { ConfigGeneratorExecutorSchema } from './schema';

const DOC_TAG = 'doc:';

/**
 * Discovers which projects opt into the docs site — those that ship a `docs/` folder with at
 * least one `.md`/`.mdx` (or a `_category_.json`) — and writes the manifest `nx-doc-projects.json`
 * in the docs app root. `sync-docs` reads it to know what to copy.
 *
 * Categorization is **taxonomy-agnostic**: the category is the value of the project's `doc:<x>`
 * tag (a dedicated docs tag, kept separate from `scope:` module boundaries). A project with a
 * `docs/` folder but no `doc:` tag is skipped with a warning. The destination folder is the
 * unscoped project name (`@fmmenchi/notify` → `notify`) so it is unique and clean.
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

  const result: DocusaurusProjectsConfig = {};

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

    const docTag = (cfg.tags ?? []).find((t) => t.startsWith(DOC_TAG));
    if (!docTag) {
      console.warn(
        `${name} ships docs/ but has no \`${DOC_TAG}<category>\` tag — skipping. Add e.g. "${DOC_TAG}libraries".`,
      );
      continue;
    }
    const category = docTag.slice(DOC_TAG.length);
    const entry: NxProjectDocEntry = {
      name,
      root: cfg.root,
      folder: name.split('/').pop() as string,
    };
    (result[category] ??= []).push(entry);
  }

  const outputPath = join(root, docRoot, configFileName);
  writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf-8');
  const summary =
    Object.entries(result)
      .map(([category, entries]) => `${entries.length} ${category}`)
      .join(', ') || 'nothing';
  console.log(`Wrote ${configFileName}: ${summary}.`);

  return { success: true };
};

export default runExecutor;

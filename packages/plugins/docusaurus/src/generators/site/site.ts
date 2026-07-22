import { formatFiles, generateFiles, type Tree } from '@nx/devkit';
import * as path from 'path';
import type { SiteGeneratorSchema } from './schema';

/**
 * Scaffolds a single-instance Docusaurus site that AGGREGATES per-package docs.
 *
 * The site is a non-published app under `apps/` (`scope:app`): workspace-level
 * docs are authored in its co-located `docs/`, and each package's own `docs/`
 * folder is assembled in at build time by the `config-generator` + `sync-docs`
 * executors (the `build`/`serve` targets depend on them). The generated
 * `.gitignore` keeps the manifest and the assembled folders out of git.
 */
export async function siteGenerator(tree: Tree, options: SiteGeneratorSchema) {
  const name = options.name ?? 'docs';
  const directory = options.directory ?? `apps/${name}`;

  generateFiles(tree, path.join(__dirname, 'files'), directory, {
    packageName: options.packageName ?? name,
    title: options.title ?? name,
    url: options.url ?? 'http://localhost:3000',
    baseUrl: options.baseUrl ?? '/',
    repoUrl: options.repoUrl ?? 'https://github.com',
    directory,
  });

  // Keep the build artifacts out of workspace-wide formatting too.
  if (tree.exists('.prettierignore')) {
    const ignore = tree.read('.prettierignore', 'utf-8') ?? '';
    const entries = [`/${directory}/build`, `/${directory}/.docusaurus`].filter(
      (e) => !ignore.includes(e),
    );
    if (entries.length > 0) {
      tree.write(
        '.prettierignore',
        `${ignore.trimEnd()}\n${entries.join('\n')}\n`,
      );
    }
  }

  await formatFiles(tree);
}

export default siteGenerator;

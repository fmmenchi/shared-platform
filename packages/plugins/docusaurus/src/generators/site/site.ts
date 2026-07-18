import {
  formatFiles,
  generateFiles,
  joinPathFragments,
  offsetFromRoot,
  type Tree,
} from '@nx/devkit';
import * as path from 'path';
import type { SiteGeneratorSchema } from './schema';

/**
 * Scaffolds a single-instance Docusaurus site that serves the repository's
 * human docs DIRECTLY from their source folder (default `doc/`): no copying,
 * no sync executors, no multi-instance silos — the site tree IS the folder
 * you already edit, and the dev server watches it natively. Targets are plain
 * `nx:run-commands` around the Docusaurus CLI (start/build/serve).
 */
export async function siteGenerator(tree: Tree, options: SiteGeneratorSchema) {
  const name = options.name ?? 'docs';
  const directory = options.directory ?? `packages/tools/${name}`;
  const docPath = options.docPath ?? 'doc';

  if (!tree.exists(docPath)) {
    throw new Error(
      `Docs folder "${docPath}" does not exist — create it (or pass --docPath) before generating the site.`,
    );
  }

  generateFiles(tree, path.join(__dirname, 'files'), directory, {
    packageName: options.packageName ?? name,
    title: options.title ?? name,
    url: options.url ?? 'http://localhost:3000',
    baseUrl: options.baseUrl ?? '/',
    repoUrl: options.repoUrl ?? 'https://github.com',
    docPath,
    offsetToDocs: joinPathFragments(offsetFromRoot(directory), docPath),
  });

  // Keep the generated output out of workspace-wide formatting too.
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

  // Docusaurus needs a landing page at slug `/`: provide one only when the
  // docs folder has no index of its own.
  const hasIndex =
    tree.exists(joinPathFragments(docPath, 'index.md')) ||
    tree.exists(joinPathFragments(docPath, 'README.md'));
  if (!hasIndex) {
    tree.write(
      joinPathFragments(docPath, 'index.md'),
      `---\nslug: /\ntitle: ${options.title ?? name}\nsidebar_position: 0\n---\n\n# ${options.title ?? name}\n\nDocumentation home. Every page in this site is a file in \`${docPath}/\` — edit there.\n`,
    );
  }

  await formatFiles(tree);
}

export default siteGenerator;

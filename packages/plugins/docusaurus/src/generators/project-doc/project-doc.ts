import {
  formatFiles,
  joinPathFragments,
  readProjectConfiguration,
  type Tree,
} from '@nx/devkit';
import type { ProjectDocGeneratorSchema } from './schema';

/**
 * Scaffolds a documentation page for a project INSIDE the docs tree the site
 * serves (default `doc/<section>/<basename>.md`), pre-filled from the
 * project's package.json. Coherent with the single-tree design: project docs
 * LIVE in the curated docs folder — nothing is aggregated or copied, this
 * generator only makes starting (and structuring) a page consistent.
 */
export async function projectDocGenerator(
  tree: Tree,
  options: ProjectDocGeneratorSchema,
) {
  const docPath = options.docPath ?? 'doc';
  const section = options.section ?? 'packages';
  if (!tree.exists(docPath)) {
    throw new Error(
      `Docs folder "${docPath}" does not exist — generate the site (or pass --docPath) first.`,
    );
  }

  const project = readProjectConfiguration(tree, options.project);
  const pkgPath = joinPathFragments(project.root, 'package.json');
  const pkg = tree.exists(pkgPath)
    ? (JSON.parse(tree.read(pkgPath, 'utf-8') as string) as {
        name?: string;
        description?: string;
      })
    : {};
  const packageName = pkg.name ?? options.project;
  const basename = project.root.split('/').pop() as string;

  const pagePath = joinPathFragments(docPath, section, `${basename}.md`);
  if (tree.exists(pagePath)) {
    throw new Error(
      `${pagePath} already exists — edit it instead of regenerating.`,
    );
  }

  // Sidebar category for the section, created once.
  const categoryPath = joinPathFragments(docPath, section, '_category_.json');
  if (!tree.exists(categoryPath)) {
    tree.write(
      categoryPath,
      `${JSON.stringify(
        {
          label: section[0].toUpperCase() + section.slice(1),
          collapsed: false,
        },
        null,
        2,
      )}\n`,
    );
  }

  tree.write(
    pagePath,
    `---
title: '${packageName}'
---

# ${packageName}

${pkg.description ?? `<!-- One sentence: what ${packageName} is and when to reach for it. -->`}

## Install

\`\`\`bash
pnpm add ${packageName}
\`\`\`

## Usage

<!-- The smallest real example a consumer needs. -->

## Reference

- Source: \`${project.root}\`
`,
  );

  await formatFiles(tree);
}

export default projectDocGenerator;

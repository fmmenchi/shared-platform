import {
  formatFiles,
  joinPathFragments,
  readProjectConfiguration,
  type Tree,
} from '@nx/devkit';
import type { ProjectDocGeneratorSchema } from './schema';

/**
 * Scaffolds a project's **in-package** documentation at `<projectRoot>/docs/index.md`,
 * pre-filled from the project's package.json. Docs live with the code; `config-generator`
 * + `sync-docs` discover and assemble every `docs/` folder into the site. This generator
 * only makes starting a page consistent.
 */
export async function projectDocGenerator(
  tree: Tree,
  options: ProjectDocGeneratorSchema,
) {
  const project = readProjectConfiguration(tree, options.project);
  const pkgPath = joinPathFragments(project.root, 'package.json');
  const pkg = tree.exists(pkgPath)
    ? (JSON.parse(tree.read(pkgPath, 'utf-8') as string) as {
        name?: string;
        description?: string;
      })
    : {};
  const packageName = pkg.name ?? options.project;

  const pagePath = joinPathFragments(project.root, 'docs', 'index.md');
  if (tree.exists(pagePath)) {
    throw new Error(
      `${pagePath} already exists — edit it instead of regenerating.`,
    );
  }

  tree.write(
    pagePath,
    `---
title: '${packageName}'
---

# ${packageName}

${
  pkg.description ??
  `<!-- One sentence: what ${packageName} is and when to reach for it. -->`
}

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

import { describe, it, expect, beforeEach } from 'vitest';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { addProjectConfiguration, type Tree } from '@nx/devkit';
import { projectDocGenerator } from './project-doc';

describe('project-doc generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    addProjectConfiguration(tree, '@acme/ui', {
      root: 'packages/client/ui',
    });
    tree.write(
      'packages/client/ui/package.json',
      JSON.stringify({ name: '@acme/ui', description: 'The components.' }),
    );
  });

  it('scaffolds docs/index.md in the package from its metadata', async () => {
    await projectDocGenerator(tree, { project: '@acme/ui' });
    const page = tree.read(
      'packages/client/ui/docs/index.md',
      'utf-8',
    ) as string;
    expect(page).toContain("title: '@acme/ui'");
    expect(page).toContain('The components.');
    expect(page).toContain('pnpm add @acme/ui');
  });

  it('refuses to overwrite an existing page', async () => {
    await projectDocGenerator(tree, { project: '@acme/ui' });
    await expect(
      projectDocGenerator(tree, { project: '@acme/ui' }),
    ).rejects.toThrow(/already exists/);
  });
});

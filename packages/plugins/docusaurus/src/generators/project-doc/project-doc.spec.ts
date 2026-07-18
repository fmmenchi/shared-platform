import { describe, it, expect, beforeEach } from 'vitest';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { addProjectConfiguration, type Tree } from '@nx/devkit';
import { projectDocGenerator } from './project-doc';

describe('project-doc generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    tree.write('doc/index.md', '# Home\n');
    addProjectConfiguration(tree, '@acme/ui', {
      root: 'packages/client/ui',
    });
    tree.write(
      'packages/client/ui/package.json',
      JSON.stringify({ name: '@acme/ui', description: 'The components.' }),
    );
  });

  it('scaffolds the page from the package metadata', async () => {
    await projectDocGenerator(tree, { project: '@acme/ui' });
    const page = tree.read('doc/packages/ui.md', 'utf-8') as string;
    expect(page).toContain("title: '@acme/ui'");
    expect(page).toContain('The components.');
    expect(page).toContain('pnpm add @acme/ui');
  });

  it('creates the section category once', async () => {
    await projectDocGenerator(tree, { project: '@acme/ui' });
    const category = JSON.parse(
      tree.read('doc/packages/_category_.json', 'utf-8') as string,
    );
    expect(category.label).toBe('Packages');
  });

  it('refuses to overwrite an existing page', async () => {
    await projectDocGenerator(tree, { project: '@acme/ui' });
    await expect(
      projectDocGenerator(tree, { project: '@acme/ui' }),
    ).rejects.toThrow(/already exists/);
  });
});

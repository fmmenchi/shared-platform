import { describe, it, expect, beforeEach } from 'vitest';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import type { Tree } from '@nx/devkit';
import { siteGenerator } from './site';

describe('site generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    tree.write('doc/architecture.md', '# Architecture\n');
  });

  it('scaffolds a site pointed DIRECTLY at the docs folder', async () => {
    await siteGenerator(tree, { name: 'docs', title: 'shared-platform' });
    const config = tree.read(
      'packages/tools/docs/docusaurus.config.ts',
      'utf-8',
    ) as string;
    expect(config).toContain("path: '../../../doc'");
    expect(config).toContain("routeBasePath: '/'");
    expect(config).toContain("title: 'shared-platform'");
    expect(tree.exists('packages/tools/docs/sidebars.ts')).toBe(true);
    expect(tree.exists('packages/tools/docs/src/css/custom.css')).toBe(true);
  });

  it('wires run-commands targets in the package.json nx block', async () => {
    await siteGenerator(tree, { name: 'docs', packageName: '@acme/docs' });
    const pkg = JSON.parse(
      tree.read('packages/tools/docs/package.json', 'utf-8') as string,
    );
    expect(pkg.name).toBe('@acme/docs');
    expect(pkg.private).toBe(true);
    expect(pkg.nx.targets.start.options.command).toBe('docusaurus start');
    expect(pkg.nx.targets.build.options.command).toBe('docusaurus build');
    expect(pkg.nx.targets.build.inputs).toContain('{workspaceRoot}/doc/**/*');
  });

  it('creates a landing page only when the docs folder has no index', async () => {
    await siteGenerator(tree, { name: 'docs' });
    expect(tree.exists('doc/index.md')).toBe(true);
    expect(tree.read('doc/index.md', 'utf-8')).toContain('slug: /');

    const tree2 = createTreeWithEmptyWorkspace();
    tree2.write('doc/README.md', '# Home\n');
    await siteGenerator(tree2, { name: 'docs' });
    expect(tree2.exists('doc/index.md')).toBe(false);
  });

  it('fails clearly when the docs folder is missing', async () => {
    const empty = createTreeWithEmptyWorkspace();
    await expect(siteGenerator(empty, { name: 'docs' })).rejects.toThrow(
      /does not exist/,
    );
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import type { Tree } from '@nx/devkit';
import { siteGenerator } from './site';

describe('site generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('scaffolds the site under apps/ with co-located docs', async () => {
    await siteGenerator(tree, { name: 'docs', title: 'shared-platform' });

    const config = tree.read(
      'apps/docs/docusaurus.config.ts',
      'utf-8',
    ) as string;
    expect(config).toContain("path: 'docs'");
    expect(config).toContain("routeBasePath: '/'");
    expect(config).toContain("onBrokenLinks: 'throw'");
    expect(config).toContain("title: 'shared-platform'");

    expect(tree.exists('apps/docs/sidebars.ts')).toBe(true);
    expect(tree.exists('apps/docs/src/css/custom.css')).toBe(true);
  });

  it('wires the aggregation targets in the package.json nx block', async () => {
    await siteGenerator(tree, { name: 'docs', packageName: '@acme/docs' });
    const pkg = JSON.parse(
      tree.read('apps/docs/package.json', 'utf-8') as string,
    );

    expect(pkg.name).toBe('@acme/docs');
    expect(pkg.private).toBe(true);
    expect(pkg.nx.tags).toContain('scope:app');

    const targets = pkg.nx.targets;
    expect(targets['config-generator'].executor).toBe(
      '@fmmenchi/nx-docusaurus:config-generator',
    );
    expect(targets['sync-docs'].executor).toBe(
      '@fmmenchi/nx-docusaurus:sync-docs',
    );
    expect(targets['sync-docs'].options.targetPath).toBe('apps/docs/docs');
    expect(targets.build.dependsOn).toContain('sync-docs');
    expect(pkg.dependencies['@fmmenchi/nx-docusaurus']).toBe('workspace:*');
  });

  it('scaffolds a landing page and the Libraries/Plugins category markers', async () => {
    await siteGenerator(tree, { name: 'docs', title: 'my-repo' });

    const landing = tree.read('apps/docs/docs/index.md', 'utf-8') as string;
    expect(landing).toContain('slug: /');
    expect(landing).toContain('# my-repo');

    expect(
      JSON.parse(
        tree.read(
          'apps/docs/docs/libraries/_category_.json',
          'utf-8',
        ) as string,
      ).label,
    ).toBe('Libraries');
    expect(
      JSON.parse(
        tree.read('apps/docs/docs/plugins/_category_.json', 'utf-8') as string,
      ).label,
    ).toBe('Plugins');
  });

  it('gitignores the manifest so the scaffold is self-contained', async () => {
    await siteGenerator(tree, { name: 'docs' });
    const gitignore = tree.read('apps/docs/.gitignore', 'utf-8') as string;
    expect(gitignore).toContain('nx-doc-projects.json');
    expect(gitignore).toContain('build');
  });

  it('honours an explicit directory', async () => {
    await siteGenerator(tree, { name: 'site', directory: 'apps/portal' });
    expect(tree.exists('apps/portal/docusaurus.config.ts')).toBe(true);
    const pkg = JSON.parse(
      tree.read('apps/portal/package.json', 'utf-8') as string,
    );
    expect(pkg.nx.targets['sync-docs'].options.targetPath).toBe(
      'apps/portal/docs',
    );
  });
});

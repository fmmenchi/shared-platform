import { readNxJson, updateNxJson, type Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { IGNOREFILE, PLUGIN, initGenerator, isRegistered } from './init';

describe('isRegistered', () => {
  it('sees the bare-string form', () => {
    expect(isRegistered([PLUGIN])).toBe(true);
  });

  it('sees the object form', () => {
    expect(isRegistered([{ plugin: PLUGIN, options: {} }])).toBe(true);
  });

  it('is false when absent, or when nothing is registered', () => {
    expect(isRegistered(['@nx/vite'])).toBe(false);
    expect(isRegistered(undefined)).toBe(false);
  });
});

describe('init generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('registers the plugin in nx.json — inference runs only once it is there', async () => {
    await initGenerator(tree);
    expect(readNxJson(tree)?.plugins).toContain(PLUGIN);
  });

  it('keeps the plugins already registered', async () => {
    updateNxJson(tree, { ...readNxJson(tree), plugins: ['@nx/vite'] });
    await initGenerator(tree);
    expect(readNxJson(tree)?.plugins).toEqual(['@nx/vite', PLUGIN]);
  });

  it('does not register twice, in either form', async () => {
    await initGenerator(tree);
    await initGenerator(tree);
    expect(readNxJson(tree)?.plugins).toEqual([PLUGIN]);

    updateNxJson(tree, { ...readNxJson(tree), plugins: [{ plugin: PLUGIN }] });
    await initGenerator(tree);
    expect(readNxJson(tree)?.plugins).toEqual([{ plugin: PLUGIN }]);
  });

  it('seeds a .trivyignore.yaml at the scan root', async () => {
    await initGenerator(tree);
    expect(tree.read(IGNOREFILE, 'utf-8')).toContain('vulnerabilities: []');
  });

  it('never overwrites suppressions that already exist', async () => {
    tree.write(IGNOREFILE, 'vulnerabilities:\n  - id: CVE-2026-16221\n');
    await initGenerator(tree);
    expect(tree.read(IGNOREFILE, 'utf-8')).toContain('CVE-2026-16221');
  });
});

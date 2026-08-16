import {
  addProjectConfiguration,
  readProjectConfiguration,
  type Tree,
} from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { SBOM_TARGET, sbomGenerator, sbomTarget } from './sbom';

describe('sbomTarget', () => {
  it('runs the sbom executor', () => {
    expect(sbomTarget().executor).toBe('@fmmenchi/nx-trivy:sbom');
  });

  it('is uncached — the dependency closure is not a project file input', () => {
    expect(sbomTarget().cache).toBe(false);
  });

  it('exposes a docker configuration (nx reserves the --runner CLI flag)', () => {
    expect(sbomTarget().configurations?.docker).toEqual({ runner: 'docker' });
  });
});

describe('sbom generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    addProjectConfiguration(tree, 'app', { root: 'apps/app', targets: {} });
  });

  it('adds the target to the project — including a private app', async () => {
    await sbomGenerator(tree, { project: 'app' });
    expect(
      readProjectConfiguration(tree, 'app').targets?.[SBOM_TARGET],
    ).toEqual(sbomTarget());
  });

  it('leaves the project’s other targets alone', async () => {
    addProjectConfiguration(tree, 'lib', {
      root: 'libs/lib',
      targets: { build: { executor: 'nx:noop' } },
    });
    await sbomGenerator(tree, { project: 'lib' });
    expect(readProjectConfiguration(tree, 'lib').targets?.build).toEqual({
      executor: 'nx:noop',
    });
  });

  it('preserves options already set on an existing sbom target', async () => {
    await sbomGenerator(tree, { project: 'app' });
    const project = readProjectConfiguration(tree, 'app');
    project.targets = {
      ...project.targets,
      [SBOM_TARGET]: { ...sbomTarget(), options: { format: 'spdx-json' } },
    };
    tree.write(
      'apps/app/project.json',
      JSON.stringify({ name: 'app', ...project }),
    );

    await sbomGenerator(tree, { project: 'app' });
    expect(
      readProjectConfiguration(tree, 'app').targets?.[SBOM_TARGET]?.options,
    ).toEqual({ format: 'spdx-json' });
  });

  it('throws on an unknown project rather than writing nothing quietly', async () => {
    await expect(sbomGenerator(tree, { project: 'ghost' })).rejects.toThrow();
  });
});

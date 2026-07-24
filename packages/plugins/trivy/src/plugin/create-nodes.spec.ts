import { describe, expect, it } from 'vitest';
import { isPublishable, sbomTarget } from './create-nodes';

describe('isPublishable', () => {
  it('is true for a named, non-private package', () => {
    expect(isPublishable({ name: '@fmmenchi/ui' })).toBe(true);
    expect(isPublishable({ name: '@fmmenchi/ui', private: false })).toBe(true);
  });

  it('is false for a private package', () => {
    expect(isPublishable({ name: '@fmmenchi/ui', private: true })).toBe(false);
  });

  it('is false for a package with no name', () => {
    expect(isPublishable({})).toBe(false);
    expect(isPublishable({ private: false })).toBe(false);
  });
});

describe('sbomTarget', () => {
  it('runs the sbom executor', () => {
    expect(sbomTarget().executor).toBe('@fmmenchi/nx-trivy:sbom');
  });

  it('depends on the plugin build, not the host project build', () => {
    expect(sbomTarget().dependsOn).toEqual([
      { projects: ['@fmmenchi/nx-trivy'], target: 'build' },
    ]);
  });

  it('is uncached — the dependency closure is not a project file input', () => {
    expect(sbomTarget().cache).toBe(false);
  });

  it('exposes a docker configuration (nx reserves the --runner CLI flag)', () => {
    expect(sbomTarget().configurations?.docker).toEqual({ runner: 'docker' });
  });
});

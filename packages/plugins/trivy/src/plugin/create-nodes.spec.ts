import { describe, expect, it } from 'vitest';
import { sbomTarget, scanTargets } from './create-nodes';

describe('scanTargets', () => {
  it('infers the four targets CI and the docs refer to by name', () => {
    expect(Object.keys(scanTargets())).toEqual([
      'scan',
      'scan-docker',
      'scan-secrets',
      'scan-secrets-docker',
    ]);
  });

  it('runs the scan executor', () => {
    expect(scanTargets().scan.executor).toBe('@fmmenchi/nx-trivy:scan');
  });

  it('is never cached — a scan goes red because the world changed, not the files', () => {
    expect(Object.values(scanTargets()).every((t) => t.cache === false)).toBe(
      true,
    );
  });

  it('picks the docker runner only for the -docker targets', () => {
    const targets = scanTargets();
    expect(targets.scan.options?.runner).toBeUndefined();
    expect(targets['scan-docker'].options?.runner).toBe('docker');
    expect(targets['scan-secrets'].options?.runner).toBeUndefined();
    expect(targets['scan-secrets-docker'].options?.runner).toBe('docker');
  });

  it('scans for secrets only in the -secrets targets, skipping vendored dirs', () => {
    const targets = scanTargets();
    expect(targets.scan.options?.scanners).toBeUndefined();
    expect(targets['scan-secrets'].options?.scanners).toBe('secret');
    expect(targets['scan-secrets'].options?.extraArgs).toContain(
      '**/node_modules',
    );
  });
});

describe('sbomTarget', () => {
  it('runs the sbom executor', () => {
    expect(sbomTarget().executor).toBe('@fmmenchi/nx-trivy:sbom');
  });

  it('is uncached — a stale bill of materials is worse than a slow one', () => {
    expect(sbomTarget().cache).toBe(false);
  });

  it('exposes a docker configuration (nx reserves the --runner CLI flag)', () => {
    expect(sbomTarget().configurations?.docker).toEqual({ runner: 'docker' });
  });

  it('carries no options — nothing about it is per-project policy any more', () => {
    expect(sbomTarget().options).toBeUndefined();
  });
});

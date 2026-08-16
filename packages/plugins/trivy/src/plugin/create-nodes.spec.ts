import { describe, expect, it } from 'vitest';
import { scanTargets } from './create-nodes';

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

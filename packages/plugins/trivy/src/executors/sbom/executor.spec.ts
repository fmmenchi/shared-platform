import { buildSbomArgs, buildSbomDockerArgs } from './executor';

describe('buildSbomArgs', () => {
  it('builds the trivy fs SBOM command', () => {
    expect(
      buildSbomArgs('cyclonedx', '/out/sbom.cdx.json', '/tmp/work'),
    ).toEqual([
      'fs',
      '--format',
      'cyclonedx',
      '--output',
      '/out/sbom.cdx.json',
      '/tmp/work',
    ]);
  });
});

describe('buildSbomDockerArgs', () => {
  it('mounts the pruned dir (ro) and the output dir, then emits to /out', () => {
    expect(
      buildSbomDockerArgs(
        'aquasec/trivy:latest',
        '/tmp/work',
        '/repo/packages/x/sbom.cdx.json',
        'cyclonedx',
      ),
    ).toEqual([
      'run',
      '--rm',
      '-v',
      '/tmp/work:/scan:ro',
      '-v',
      '/repo/packages/x:/out',
      'aquasec/trivy:latest',
      'fs',
      '--format',
      'cyclonedx',
      '--output',
      '/out/sbom.cdx.json',
      '/scan',
    ]);
  });
});

import { buildTrivyArgs, buildDockerArgs } from './executor';

describe('buildTrivyArgs', () => {
  it('defaults to a workspace-wide vuln scan that fails on CRITICAL/HIGH', () => {
    expect(buildTrivyArgs({})).toEqual([
      'fs',
      '--scanners',
      'vuln',
      '--severity',
      'CRITICAL,HIGH',
      '--format',
      'table',
      '--exit-code',
      '1',
      '.',
    ]);
  });

  it('drops --exit-code when failOnFindings is false (report-only)', () => {
    const args = buildTrivyArgs({ failOnFindings: false });
    expect(args).not.toContain('--exit-code');
  });

  it('threads scanners, severity, ignorefile, extraArgs and path through', () => {
    const args = buildTrivyArgs({
      scanners: 'vuln,secret',
      severity: 'CRITICAL',
      ignorefile: '.trivyignore',
      extraArgs: ['--skip-dirs', 'dist'],
      path: 'packages',
    });
    expect(args).toEqual([
      'fs',
      '--scanners',
      'vuln,secret',
      '--severity',
      'CRITICAL',
      '--format',
      'table',
      '--exit-code',
      '1',
      '--ignorefile',
      '.trivyignore',
      '--skip-dirs',
      'dist',
      'packages',
    ]);
  });
});

describe('buildDockerArgs', () => {
  it('mounts the workspace and caches the DB, then appends the trivy args', () => {
    expect(
      buildDockerArgs('/repo', 'aquasec/trivy:latest', ['fs', '.']),
    ).toEqual([
      'run',
      '--rm',
      '-v',
      '/repo:/workspace',
      '-w',
      '/workspace',
      '-v',
      'trivy-cache:/root/.cache/trivy',
      'aquasec/trivy:latest',
      'fs',
      '.',
    ]);
  });

  it('bind-mounts a cacheDir when given (CI DB caching), else a named volume', () => {
    expect(
      buildDockerArgs('/repo', 'aquasec/trivy:latest', ['fs', '.'], '/tmp/tc'),
    ).toContain('/tmp/tc:/root/.cache/trivy');
    expect(
      buildDockerArgs('/repo', 'aquasec/trivy:latest', ['fs', '.']),
    ).toContain('trivy-cache:/root/.cache/trivy');
  });
});

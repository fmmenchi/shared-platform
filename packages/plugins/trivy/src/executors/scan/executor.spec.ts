import {
  buildTrivyArgs,
  buildDockerArgs,
  nestedWorktreeSkipArgs,
} from './executor';

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

describe('buildTrivyArgs — report output', () => {
  it('writes to the given path, workspace-relative for both runners', () => {
    const args = buildTrivyArgs({
      format: 'json',
      output: 'trivy-report.json',
    });

    expect(args).toContain('--output');
    expect(args[args.indexOf('--output') + 1]).toBe('trivy-report.json');
    // The path is left alone: the docker runner works in /workspace, which IS the workspace.
    expect(args.join(' ')).not.toContain('/workspace');
  });

  it('omits the flag entirely when no report is wanted', () => {
    expect(buildTrivyArgs({}).join(' ')).not.toContain('--output');
  });
});

describe('nestedWorktreeSkipArgs', () => {
  const porcelain = [
    'worktree /repo',
    'HEAD 39cc0af',
    'branch refs/heads/main',
    '',
    'worktree /repo/.claude/worktrees/feat-x',
    'HEAD 6ad7970',
    'branch refs/heads/feat/x',
    '',
    'worktree /elsewhere/jobs/tmp/balance',
    'HEAD bae067b',
    'detached',
    '',
  ].join('\n');

  // Another checkout of the same repository, at another commit: its lockfile is not this
  // workspace's, and reading it reported findings that were true only of a stale branch.
  it('skips a worktree checked out inside the workspace', () => {
    expect(nestedWorktreeSkipArgs(porcelain, '/repo')).toEqual([
      '--skip-dirs',
      '.claude/worktrees/feat-x',
    ]);
  });

  it('never skips the workspace itself, nor a worktree that lives outside it', () => {
    const args = nestedWorktreeSkipArgs(porcelain, '/repo');
    expect(args).not.toContain('');
    expect(args.join(' ')).not.toContain('elsewhere');
  });

  it('adds nothing when git had nothing to say', () => {
    expect(nestedWorktreeSkipArgs('', '/repo')).toEqual([]);
  });
});

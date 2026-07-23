import type { PromiseExecutor } from '@nx/devkit';
import { execFileSync } from 'node:child_process';
import type { ScanExecutorSchema } from './schema';

const DEFAULTS = {
  scanType: 'fs' as const,
  path: '.',
  scanners: 'vuln',
  severity: 'CRITICAL,HIGH',
  failOnFindings: true,
  format: 'table',
};

/**
 * Builds the `trivy` argument vector from the options. Pure — this is the
 * unit-tested core, so the shell-out itself needs no test of its own.
 */
export function buildTrivyArgs(options: ScanExecutorSchema): string[] {
  const o = { ...DEFAULTS, ...options };
  return [
    o.scanType,
    '--scanners',
    o.scanners,
    '--severity',
    o.severity,
    '--format',
    o.format,
    ...(o.failOnFindings ? ['--exit-code', '1'] : []),
    ...(o.ignorefile ? ['--ignorefile', o.ignorefile] : []),
    ...(o.extraArgs ?? []),
    o.path,
  ];
}

const DOCKER_IMAGE = 'aquasec/trivy:latest';

/**
 * Wraps the trivy args in a `docker run` that mounts the workspace at `/workspace`
 * and persists the vuln DB in a named volume (so it is not re-downloaded each run).
 * Lets a machine with no local `trivy` still scan — only Docker is required.
 */
export function buildDockerArgs(
  root: string,
  image: string,
  trivyArgs: string[],
): string[] {
  return [
    'run',
    '--rm',
    '-v',
    `${root}:/workspace`,
    '-w',
    '/workspace',
    '-v',
    'trivy-cache:/root/.cache/trivy',
    image,
    ...trivyArgs,
  ];
}

/**
 * Runs a Trivy security scan from the workspace root, via the local `trivy` CLI
 * or the `aquasec/trivy` Docker image (`runner: docker`). The runner binary is
 * external: a missing binary fails loudly with an install hint (never a silent
 * pass), and a non-zero exit — findings at/above the severity threshold when
 * `failOnFindings` is on — fails the target.
 */
const runExecutor: PromiseExecutor<ScanExecutorSchema> = async (
  options,
  context,
) => {
  const trivyArgs = buildTrivyArgs(options);
  const runner = options.runner ?? 'local';
  const [bin, args] =
    runner === 'docker'
      ? ([
          'docker',
          buildDockerArgs(
            context.root,
            options.dockerImage ?? DOCKER_IMAGE,
            trivyArgs,
          ),
        ] as const)
      : (['trivy', trivyArgs] as const);

  console.log(`> ${bin} ${args.join(' ')}`);
  try {
    execFileSync(bin, args, { cwd: context.root, stdio: 'inherit' });
    return { success: true };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.error(
        runner === 'docker'
          ? 'Docker is not installed or not on PATH — required for `runner: docker`.'
          : 'Trivy is not installed or not on PATH. Install it (https://trivy.dev/latest/getting-started/installation/) — e.g. `brew install trivy` — or set `runner: docker`.',
      );
      return { success: false };
    }
    /* Non-zero exit: findings at/above the severity threshold, or a scan error. */
    return { success: false };
  }
};

export default runExecutor;

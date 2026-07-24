import type { PromiseExecutor } from '@nx/devkit';
import { createProjectGraphAsync } from '@nx/devkit';
import { createLockFile, createPackageJson, getLockFileName } from '@nx/js';
import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import type { SbomExecutorSchema } from './schema';

const DOCKER_IMAGE = 'aquasec/trivy:latest';

/** The `trivy fs` argument vector that emits the SBOM. Pure — unit-tested. */
export function buildSbomArgs(
  format: string,
  outputPath: string,
  scanDir: string,
): string[] {
  return ['fs', '--format', format, '--output', outputPath, scanDir];
}

/** Wraps the SBOM args in a `docker run` that mounts the pruned dir and the output dir. */
export function buildSbomDockerArgs(
  image: string,
  scanDir: string,
  outputAbs: string,
  format: string,
): string[] {
  return [
    'run',
    '--rm',
    '-v',
    `${scanDir}:/scan:ro`,
    '-v',
    `${dirname(outputAbs)}:/out`,
    image,
    ...buildSbomArgs(format, `/out/${basename(outputAbs)}`, '/scan'),
  ];
}

/**
 * Generates a CycloneDX SBOM for one project's production dependency closure.
 *
 * A pnpm monorepo has no per-package lockfile, so Trivy can't read a package's
 * deps directly (scanning the package dir yields nothing). We reconstruct them:
 * nx's `createPackageJson` prunes the project's package.json to its real deps and
 * `createLockFile` emits the matching lockfile; Trivy reads that pruned lock to
 * build the SBOM — exactly what a consumer installs, the right artifact to attach
 * to the published release.
 */
const runExecutor: PromiseExecutor<SbomExecutorSchema> = async (
  options,
  context,
) => {
  const project = options.projectName ?? context.projectName;
  if (!project) {
    console.error(
      'sbom: no project — pass --projectName or run the target on a project.',
    );
    return { success: false };
  }
  const cfg = context.projectsConfigurations.projects[project];
  if (!cfg) {
    console.error(`sbom: unknown project "${project}".`);
    return { success: false };
  }

  const graph = await createProjectGraphAsync();
  const packageJson = createPackageJson(project, graph, { root: context.root });
  const lockFile = createLockFile(packageJson, graph, 'pnpm');

  const format = options.format ?? 'cyclonedx';
  const outputRel = options.output ?? join(cfg.root, 'sbom.cdx.json');
  const outputAbs = join(context.root, outputRel);
  const runner = options.runner ?? 'local';

  const work = mkdtempSync(join(tmpdir(), 'nx-trivy-sbom-'));
  // Scan a dir named after the package, so Trivy roots the SBOM at the package name
  // (`@fmmenchi/notify` → `notify`) rather than the temp path.
  const scanDir = join(work, project.split('/').pop() as string);
  try {
    mkdirSync(scanDir, { recursive: true });
    writeFileSync(
      join(scanDir, 'package.json'),
      JSON.stringify(packageJson, null, 2),
    );
    writeFileSync(join(scanDir, getLockFileName('pnpm')), lockFile);
    mkdirSync(dirname(outputAbs), { recursive: true });

    const [bin, args] =
      runner === 'docker'
        ? ([
            'docker',
            buildSbomDockerArgs(
              options.dockerImage ?? DOCKER_IMAGE,
              scanDir,
              outputAbs,
              format,
            ),
          ] as const)
        : (['trivy', buildSbomArgs(format, outputAbs, scanDir)] as const);

    console.log(`> ${bin} ${args.join(' ')}`);
    execFileSync(bin, args, { stdio: 'inherit' });

    // Trivy names the SBOM's root component after the scan path; rename it to the
    // package (CycloneDX only — the default format).
    if (format === 'cyclonedx') {
      try {
        const sbom = JSON.parse(readFileSync(outputAbs, 'utf-8'));
        if (sbom?.metadata?.component) {
          sbom.metadata.component.name = project;
          if (packageJson.version) {
            sbom.metadata.component.version = packageJson.version;
          }
          writeFileSync(outputAbs, `${JSON.stringify(sbom, null, 2)}\n`);
        }
      } catch {
        /* leave Trivy's output as-is if it isn't the shape we expect */
      }
    }

    console.log(`SBOM (${format}) for ${project} → ${outputRel}`);
    return { success: true };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.error(
        runner === 'docker'
          ? 'Docker is not installed or not on PATH — required for `runner: docker`.'
          : 'Trivy is not installed or not on PATH (`brew install trivy`) — or set `runner: docker`.',
      );
      return { success: false };
    }
    console.error(String(error));
    return { success: false };
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
};

export default runExecutor;

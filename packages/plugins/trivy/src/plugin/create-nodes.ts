import type { CreateNodesResultV2, CreateNodesV2 } from '@nx/devkit';
import { createNodesFromFiles } from '@nx/devkit';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const PLUGIN = '@fmmenchi/nx-trivy';
const SBOM_TARGET = 'sbom';

type PackageJson = { name?: string; private?: boolean };
type ProjectNode = NonNullable<
  CreateNodesResultV2[number][1]['projects']
>[string];

/** True when a package.json describes a publishable package (has a name, not private). */
export function isPublishable(pkg: PackageJson): boolean {
  return Boolean(pkg.name) && pkg.private !== true;
}

/**
 * The `sbom` target inferred onto a project. `dependsOn` the plugin's own `build`
 * (the executor runs from the plugin's `dist`, not the host project's). Uncached:
 * the SBOM tracks the whole dependency closure (the lockfile), which a project's
 * own file inputs don't capture — a cache hit could serve a stale bill of materials.
 *
 * A `docker` configuration flips the executor to the aquasec/trivy image. It is set
 * here (not via a CLI `--runner=docker`) because nx reserves `--runner` for its
 * tasks-runner selection — passing it on the CLI never reaches the executor. Select
 * it with `--configuration=docker` (what CI does, where there is no local trivy).
 */
export function sbomTarget(): NonNullable<ProjectNode['targets']>[string] {
  return {
    executor: `${PLUGIN}:${SBOM_TARGET}`,
    cache: false,
    dependsOn: [{ projects: [PLUGIN], target: 'build' }],
    configurations: { docker: { runner: 'docker' } },
    metadata: {
      description:
        'Generate a CycloneDX SBOM for this package (inferred by @fmmenchi/nx-trivy).',
      technologies: ['trivy'],
    },
  };
}

/**
 * Infers a `sbom` target onto every **publishable** package — a project under
 * `packages/<scope>/<name>` with a `name` and no `private: true`. An SBOM is a
 * per-package artifact, so the target belongs on each project rather than being
 * invoked centrally.
 */
export const createNodesV2: CreateNodesV2 = [
  'packages/*/*/package.json',
  (configFiles, options, context) =>
    createNodesFromFiles(
      (configFile) => {
        let pkg: PackageJson;
        try {
          pkg = JSON.parse(
            readFileSync(join(context.workspaceRoot, configFile), 'utf-8'),
          );
        } catch {
          return {};
        }
        if (!isPublishable(pkg)) return {};

        return {
          projects: {
            [dirname(configFile)]: { targets: { [SBOM_TARGET]: sbomTarget() } },
          },
        };
      },
      configFiles,
      options,
      context,
    ),
];

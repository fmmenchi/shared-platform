import {
  formatFiles,
  readProjectConfiguration,
  updateProjectConfiguration,
  type TargetConfiguration,
  type Tree,
} from '@nx/devkit';
import type { SbomGeneratorSchema } from './schema';

export const SBOM_TARGET = 'sbom';

/**
 * The `sbom` target this generator writes. Uncached: an SBOM tracks the whole dependency
 * closure (the lockfile), which a project's own file inputs don't capture — a cache hit
 * could serve a stale bill of materials.
 *
 * The `docker` configuration flips the executor to the aquasec/trivy image. It is a
 * configuration and not a CLI `--runner=docker` because nx reserves `--runner` for its
 * tasks-runner selection, so that flag never reaches the executor. Select it with
 * `--configuration=docker` (what CI does, where there is no local trivy).
 */
export function sbomTarget(): TargetConfiguration {
  return {
    executor: '@fmmenchi/nx-trivy:sbom',
    cache: false,
    configurations: { docker: { runner: 'docker' } },
  };
}

/**
 * Adds the `sbom` target to a project — the bill of materials for what that package ships.
 *
 * Opt-in per project, by design: whether a package publishes an SBOM is a policy of the
 * workspace (what you distribute, and who audits it), not a fact derivable from its files.
 * Inferring it onto every "publishable" package smuggled one repo's release policy into every
 * consumer, and got it backwards in both directions — a private app that ships to production
 * is exactly what a bill of materials is for, and it was the one project excluded.
 *
 * Idempotent: re-running preserves any options already set on the target.
 */
export async function sbomGenerator(tree: Tree, options: SbomGeneratorSchema) {
  const project = readProjectConfiguration(tree, options.project);
  const existing = project.targets?.[SBOM_TARGET];

  project.targets = {
    ...project.targets,
    [SBOM_TARGET]: { ...sbomTarget(), ...existing },
  };
  updateProjectConfiguration(tree, options.project, project);

  if (!options.skipFormat) await formatFiles(tree);
}

export default sbomGenerator;

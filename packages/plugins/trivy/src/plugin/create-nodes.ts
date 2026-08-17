import type { CreateNodesResultV2, CreateNodesV2 } from '@nx/devkit';
import { createNodesFromFiles } from '@nx/devkit';
import { dirname } from 'node:path';

const PLUGIN = '@fmmenchi/nx-trivy';

type ProjectNode = NonNullable<
  CreateNodesResultV2[number][1]['projects']
>[string];
type Targets = NonNullable<ProjectNode['targets']>;

/** Dirs a secret scan must never walk: vendored code and build output, all noise. */
const SECRET_SKIP_DIRS = [
  '--skip-dirs',
  '**/node_modules',
  '--skip-dirs',
  '**/dist',
  '--skip-dirs',
  '**/build',
  '--skip-dirs',
  '**/.nx',
  '--skip-dirs',
  '.git',
];

/**
 * The four scan targets, inferred onto the workspace root project.
 *
 * Uncached, always: a scan goes red because the WORLD changed — a CVE published against a
 * dependency nobody touched — so a cache hit keyed on unchanged files would serve a green
 * that means nothing.
 */
export function scanTargets(): Targets {
  const scan = (options: Record<string, unknown>) => ({
    executor: `${PLUGIN}:scan`,
    cache: false,
    options,
    metadata: {
      description:
        'Scan the workspace with Trivy (inferred by @fmmenchi/nx-trivy).',
      technologies: ['trivy'],
    },
  });
  const secret = { scanners: 'secret', extraArgs: SECRET_SKIP_DIRS };

  return {
    scan: scan({}),
    'scan-docker': scan({ runner: 'docker' }),
    'scan-secrets': scan(secret),
    'scan-secrets-docker': scan({ ...secret, runner: 'docker' }),
  };
}

/**
 * The `sbom` target inferred onto a project. Uncached: an SBOM tracks the whole dependency
 * closure (the lockfile), which a project's own file inputs don't capture — a cache hit
 * could serve a stale bill of materials.
 *
 * The `docker` configuration flips the executor to the aquasec/trivy image. It is a
 * configuration and not a CLI `--runner=docker` because nx reserves `--runner` for its
 * tasks-runner selection, so that flag never reaches the executor.
 */
export function sbomTarget(): Targets[string] {
  return {
    executor: `${PLUGIN}:sbom`,
    cache: false,
    configurations: { docker: { runner: 'docker' } },
    metadata: {
      description:
        'Generate a CycloneDX SBOM for this project (inferred by @fmmenchi/nx-trivy).',
      technologies: ['trivy'],
    },
  };
}

/**
 * Infers the scan targets onto the **workspace root project** (creating that project when the
 * workspace has none), and `sbom` onto **every other project with a package.json**.
 *
 * Why the scan is on the root: it runs from `context.root` whatever project hosts it
 * (ADR-0007), so the host is pure ceremony, and one host means `nx run-many -t scan-docker`
 * can never repeat the same workspace-wide scan N times.
 *
 * Why `sbom` is on everything (ADR-0031): any project with a package.json HAS a dependency
 * closure, so being describable is a fact, not a policy. Which releases carry a bill of
 * materials is the policy — and it already lives where it belongs, in the release record the
 * CI reads: whatever nx released gets one. An earlier design put that decision in the
 * target's existence and had it generated per project; it excluded exactly the case that
 * motivated it (an app, which is never "publishable" but is the thing that ships), and left
 * a package silently without an SBOM because nobody had run a generator.
 *
 * The root project is skipped: its package.json describes the workspace, not a package.
 */
export const createNodesV2: CreateNodesV2 = [
  '**/package.json',
  (configFiles, options, context) =>
    createNodesFromFiles(
      (configFile) => {
        const projectRoot = dirname(configFile);
        const isRoot = projectRoot === '.' || projectRoot === '';
        return {
          projects: {
            [isRoot ? '.' : projectRoot]: {
              targets: isRoot ? scanTargets() : { sbom: sbomTarget() },
            },
          },
        };
      },
      configFiles,
      options,
      context,
    ),
];

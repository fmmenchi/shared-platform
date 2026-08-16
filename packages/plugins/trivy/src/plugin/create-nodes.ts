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
 * Infers the scan targets onto the **workspace root project**, creating that project when the
 * workspace has none — matched by the root `package.json`, so it works in any layout.
 *
 * Why root, and why inferred at all: the scan runs from `context.root` whatever project hosts
 * it (ADR-0007), so the host is pure ceremony — and asking every consumer to hand-write a
 * target whose only purpose is to name an executor is ceremony we can delete. Registering the
 * plugin IS the intent; the targets follow. Exactly one host also means `nx run-many -t
 * scan-docker` can never run the same workspace-wide scan N times.
 *
 * The `sbom` target is deliberately NOT inferred: whether a package publishes a bill of
 * materials is a policy of the workspace, not a fact about its files — an app that ships to
 * production may want one while a published helper lib does not. It is opt-in, per project,
 * via the `sbom` generator.
 */
export const createNodesV2: CreateNodesV2 = [
  '**/package.json',
  (configFiles, options, context) =>
    createNodesFromFiles(
      (configFile) => {
        const projectRoot = dirname(configFile);
        if (projectRoot !== '.' && projectRoot !== '') return {};
        return { projects: { '.': { targets: scanTargets() } } };
      },
      configFiles,
      options,
      context,
    ),
];

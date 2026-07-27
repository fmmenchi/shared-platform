import type { CreateNodesResultV2, CreateNodesV2 } from '@nx/devkit';
import { createNodesFromFiles } from '@nx/devkit';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const PLUGIN = '@fmmenchi/nx-notify';

type PackageJson = { name?: string; private?: boolean };
type ProjectNode = NonNullable<
  CreateNodesResultV2[number][1]['projects']
>[string];
type Target = NonNullable<ProjectNode['targets']>[string];

/** A publishable package: a named, non-private project. Structure-agnostic. */
export function isPublishable(pkg: PackageJson): boolean {
  return Boolean(pkg.name) && pkg.private !== true;
}

/**
 * An `announce-{release,error}` target inferred onto a project. `dependsOn` the
 * plugin's own `build` (the executor runs from the plugin's `dist`). Uncached: it
 * posts to Slack, so it must run every time — never serve a cached "sent".
 */
export function announceTarget(kind: 'release' | 'error'): Target {
  return {
    executor: `${PLUGIN}:announce-${kind}`,
    cache: false,
    dependsOn: [{ projects: [PLUGIN], target: 'build' }],
    metadata: {
      description: `Announce a ${kind} to Slack (inferred by @fmmenchi/nx-notify).`,
      technologies: ['slack'],
    },
  };
}

/**
 * Infers `announce-release` + `announce-error` onto every **publishable** package,
 * in ANY workspace layout (`packages/`, `libs/`, flat …) — matched by `**\/package.json`
 * and filtered by publishability, not a hardcoded path. Announcing a release is a
 * per-package concern, so the target belongs on each project.
 */
export const createNodesV2: CreateNodesV2 = [
  '**/package.json',
  (configFiles, options, context) =>
    createNodesFromFiles(
      (configFile) => {
        const projectRoot = dirname(configFile);
        // Skip the workspace-root package.json — it isn't a project.
        if (projectRoot === '.' || projectRoot === '') return {};
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
            [projectRoot]: {
              targets: {
                'announce-release': announceTarget('release'),
                'announce-error': announceTarget('error'),
              },
            },
          },
        };
      },
      configFiles,
      options,
      context,
    ),
];

import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The projects `nx release` may cut: a published package (non-private), OR a
 * `scope:ops` toolkit. Ops libs (e.g. the gh-actions reusable CI) are versioned +
 * tagged but NOT published to npm, so they are `private` yet still take part.
 */
export function listReleasable(): Set<string> {
  const releasable = new Set<string>();
  for (const scope of readdirSync('packages')) {
    const scopeDir = join('packages', scope);
    if (!statSync(scopeDir).isDirectory()) continue;
    for (const name of readdirSync(scopeDir)) {
      const pkg = join(scopeDir, name, 'package.json');
      if (!existsSync(pkg)) continue;
      const p = JSON.parse(readFileSync(pkg, 'utf8')) as {
        name?: string;
        private?: boolean;
        nx?: { tags?: string[] };
      };
      const isOpsToolkit = (p.nx?.tags ?? []).includes('scope:ops');
      if (p.name && (!p.private || isOpsToolkit)) releasable.add(p.name);
    }
  }
  return releasable;
}

/**
 * The RELEASABLE projects nx marks AFFECTED between base and head. nx affected is
 * input-aware (root files like AGENTS.md / workflows aren't project inputs) and
 * dependency-aware — this is how the release job decides what to version, sidestepping
 * nx release's "root files apply to ALL projects" cascade (nx #34542). Without a base
 * (first release), every releasable project is returned.
 */
export function affectedReleasable(
  base: string | undefined,
  head = 'HEAD',
): string[] {
  const releasable = listReleasable();
  const cmd = base
    ? `pnpm nx show projects --affected --base=${base} --head=${head} --json`
    : `pnpm nx show projects --json`;
  const affected = JSON.parse(execSync(cmd, { encoding: 'utf8' })) as string[];
  return affected.filter((n) => releasable.has(n));
}

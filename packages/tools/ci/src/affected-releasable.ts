// Prints the comma-separated RELEASABLE projects (non-private packages under
// packages/*/*) that nx marks AFFECTED between BASE and HEAD.
//
// nx affected is input-aware (root files like AGENTS.md / workflows aren't project inputs,
// so they don't cascade) and dependency-aware (a dependent of a changed project is
// affected too; with pluginsConfig @nx/js.projectsAffectedByDependencyUpdates="auto" a
// lockfile change affects only the projects whose resolved deps changed). This is how the
// release job decides what to version, sidestepping nx release's "root files apply to ALL
// projects" cascade (nx #34542). The CALLER resolves BASE (the workflow, from the push).
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const base = process.env['BASE'];
const head = process.env['HEAD'] ?? 'HEAD';

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
    };
    if (p.name && !p.private) releasable.add(p.name);
  }
}

const cmd = base
  ? `pnpm nx show projects --affected --base=${base} --head=${head} --json`
  : `pnpm nx show projects --json`;
const affected = JSON.parse(execSync(cmd, { encoding: 'utf8' })) as string[];

process.stdout.write(affected.filter((n) => releasable.has(n)).join(','));

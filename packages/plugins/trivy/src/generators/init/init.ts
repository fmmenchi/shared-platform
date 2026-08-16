import { formatFiles, readNxJson, updateNxJson, type Tree } from '@nx/devkit';
import type { NxJsonConfiguration } from '@nx/devkit';
import type { InitGeneratorSchema } from './schema';

export const PLUGIN = '@fmmenchi/nx-trivy';
export const IGNOREFILE = '.trivyignore.yaml';

/**
 * The seeded suppression file. Trivy auto-detects it at the scan root (both runners —
 * the docker one mounts the workspace at /workspace), so it needs no `ignorefile` option.
 * It ships empty on purpose: it exists to be found, and to carry the policy that keeps it
 * from filling up.
 */
const IGNOREFILE_TEMPLATE = `# Trivy vulnerability suppressions (structured), read by @fmmenchi/nx-trivy. This file
# lives at the scan root so Trivy auto-detects it.
#
# POLICY — prefer FIXING over ignoring:
#   1. Bump the dependency. For a TRANSITIVE one that means an \`overrides\` entry in your
#      package manager's workspace config, scoped to the vulnerable version line.
#   2. Add an entry below ONLY when no fix exists, or the risk is formally accepted —
#      always with a \`statement\` (why) AND \`expired_at\` (so it is re-reviewed), e.g.:
#
#        - id: CVE-2026-16221
#          statement: 'Vulnerable code path not reached in our usage.'
#          expired_at: 2026-12-31
#
vulnerabilities: []
`;

/**
 * True when nx.json already lists the plugin — in either accepted form, the bare string
 * or the `{ plugin, options }` object. Registration is what makes the plugin's inference
 * run at all, so this generator is the entry point for everything else it provides.
 */
export function isRegistered(plugins: NxJsonConfiguration['plugins']): boolean {
  return (plugins ?? []).some(
    (entry) => (typeof entry === 'string' ? entry : entry.plugin) === PLUGIN,
  );
}

/**
 * Initialises Trivy scanning in a workspace: registers the plugin in nx.json and seeds a
 * `.trivyignore.yaml` at the scan root. `nx add @fmmenchi/nx-trivy` runs this generator by
 * name — Nx invokes `<plugin>:init` and silently no-ops when it is absent, which is why the
 * name is fixed. Idempotent: re-running touches neither an existing registration nor an
 * existing ignorefile.
 */
export async function initGenerator(
  tree: Tree,
  options: InitGeneratorSchema = {},
) {
  const nxJson = readNxJson(tree) ?? {};
  if (!isRegistered(nxJson.plugins)) {
    nxJson.plugins = [...(nxJson.plugins ?? []), PLUGIN];
    updateNxJson(tree, nxJson);
  }

  if (!tree.exists(IGNOREFILE)) tree.write(IGNOREFILE, IGNOREFILE_TEMPLATE);

  if (!options.skipFormat) await formatFiles(tree);
}

export default initGenerator;

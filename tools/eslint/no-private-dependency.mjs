/**
 * fmmenchi/no-private-dependency — a published manifest must not depend on a
 * package nobody can install.
 *
 * The defect this exists for shipped as `@fmmenchi/ui@0.7.20`. `@fmmenchi/theme`
 * is private and source-only — its consumers bundle it — but `ui` listed it under
 * `dependencies`, `nx release` rewrote `workspace:*` into `0.0.6` at publish,
 * and every `pnpm add @fmmenchi/ui` outside this repo failed with a 404 on a
 * package that has never existed on the registry. Nothing here could see it:
 * inside the workspace the link resolves, the suite runs against source, and
 * the registry is the only place the manifest is ever read as written. Same
 * blind spot as the `require("react")` shim in the ui `vite.config.mts` — the
 * mistake is easy in the config and only visible in the artifact.
 *
 * So the check is on the manifest, in the gate, for every project: an entry in
 * `dependencies`, `peerDependencies` or `optionalDependencies` that resolves to a
 * `private: true` package is an error. `devDependencies` are not published and
 * may name anything. A manifest that is itself private publishes nothing and is
 * exempt.
 *
 * Resolution goes through the project's own `node_modules`, which is the link
 * `pnpm publish` reads too — so the rule sees exactly what the registry would.
 * An entry that does not resolve is left to `@nx/dependency-checks` and to the
 * install itself; this rule has one question and asks only that.
 */
import fs from 'node:fs';
import path from 'node:path';

const SECTIONS = new Set([
  'dependencies',
  'peerDependencies',
  'optionalDependencies',
]);

function readManifest(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return undefined;
  }
}

function keyOf(property) {
  const { key } = property;
  if (key.type === 'JSONLiteral') return String(key.value);
  if (key.type === 'JSONIdentifier') return key.name;
  return undefined;
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'disallow a published package from depending on a private workspace package',
    },
    schema: [],
    messages: {
      privateDependency:
        '"{{name}}" is private ({{manifest}} declares `private: true`), so it is never on the registry and every install of this package outside the workspace fails with a 404. If only dev code (docs, stories, tests, tooling) uses it, move it to devDependencies; if shipped code does, bundle it the way @fmmenchi/nx-theme-generator does and keep it out of {{section}}.',
    },
  },
  create(context) {
    const file = context.filename;
    if (path.basename(file) !== 'package.json') return {};
    const self = readManifest(file);
    if (!self || self.private === true) return {};
    const dir = path.dirname(file);

    return {
      JSONProperty(node) {
        const section = keyOf(node);
        if (
          section === undefined ||
          !SECTIONS.has(section) ||
          node.parent?.parent?.type !== 'JSONExpressionStatement' ||
          node.value.type !== 'JSONObjectExpression'
        ) {
          return;
        }
        for (const entry of node.value.properties) {
          const name = keyOf(entry);
          if (name === undefined) continue;
          const manifest = path.join(dir, 'node_modules', name, 'package.json');
          const dependency = readManifest(manifest);
          if (dependency?.private !== true) continue;
          context.report({
            node: entry,
            messageId: 'privateDependency',
            data: {
              name,
              section,
              manifest: path.join(
                path.relative(
                  dir,
                  fs.realpathSync(path.join(dir, 'node_modules', name)),
                ),
                'package.json',
              ),
            },
          });
        }
      },
    };
  },
};

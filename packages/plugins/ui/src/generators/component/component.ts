import {
  formatFiles,
  generateFiles,
  joinPathFragments,
  names,
  type Tree,
} from '@nx/devkit';
import * as path from 'path';
import type { ComponentGeneratorSchema } from './schema';

/** The design-system package this generator scaffolds into. */
const UI_ROOT = 'packages/client/ui';

/**
 * Scaffolds a `@fmmenchi/ui` component with the FULL archetype — the structure
 * the Button established (see its files for the reference patterns): component,
 * types, cva variants, token-only module.css, curated stories, mdx doc, tests
 * (semantics + snapshot + axe per variant×theme) and the folder barrel — then
 * wires the public surface so nothing is forgotten:
 *
 * - `src/index.ts` (root barrel) re-exports the component/variants/types;
 * - `package.json` gains the `./<name>` and `./<name>/style.css` subpaths;
 * - `vite.config.mts` gains the component's build entry.
 *
 * Throws if the component folder already exists.
 */
export async function componentGenerator(
  tree: Tree,
  options: ComponentGeneratorSchema,
) {
  const { fileName, className, propertyName } = names(options.name);
  const element = options.element ?? 'div';
  const componentDir = joinPathFragments(
    UI_ROOT,
    'src',
    'components',
    fileName,
  );

  if (tree.exists(componentDir)) {
    throw new Error(
      `${componentDir} already exists — edit the component instead of regenerating.`,
    );
  }

  const substitutions = { fileName, className, propertyName, element };
  generateFiles(
    tree,
    path.join(__dirname, 'files', 'base'),
    componentDir,
    substitutions,
  );
  if (options.messages) {
    generateFiles(
      tree,
      path.join(__dirname, 'files', 'messages'),
      componentDir,
      substitutions,
    );
  }

  addToRootBarrel(tree, { fileName, className, propertyName });
  addPackageExports(tree, fileName);
  addViteEntry(tree, { fileName, propertyName });

  await formatFiles(tree);
}

/** Append the component's public re-exports to the root barrel. */
function addToRootBarrel(
  tree: Tree,
  n: { fileName: string; className: string; propertyName: string },
): void {
  const barrelPath = joinPathFragments(UI_ROOT, 'src', 'index.ts');
  const barrel = tree.read(barrelPath, 'utf-8') ?? '';
  tree.write(
    barrelPath,
    `${barrel.trimEnd()}\n` +
      `export { ${n.className} } from './components/${n.fileName}/${n.fileName}.component.js';\n` +
      `export { ${n.propertyName}Variants } from './components/${n.fileName}/${n.fileName}.variants.js';\n` +
      `export type {\n  ${n.className}Props,\n  ${n.className}Variants,\n} from './components/${n.fileName}/${n.fileName}.types.js';\n`,
  );
}

/** Add the `./<name>` and `./<name>/style.css` subpath exports (tree-shaking). */
function addPackageExports(tree: Tree, fileName: string): void {
  const pkgPath = joinPathFragments(UI_ROOT, 'package.json');
  const raw = tree.read(pkgPath, 'utf-8');
  if (raw === null) return; // Tree-based tests may omit it; the real repo has it.
  const pkg = JSON.parse(raw) as { exports?: Record<string, unknown> };
  if (!pkg.exports) return;
  pkg.exports[`./${fileName}`] = {
    '@fmmenchi/source': `./src/components/${fileName}/index.ts`,
    types: `./dist/components/${fileName}/index.d.ts`,
    import: `./dist/${fileName}.js`,
    default: `./dist/${fileName}.js`,
  };
  pkg.exports[`./${fileName}/style.css`] = `./dist/${fileName}.css`;
  tree.write(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

/** Add the component's entry to the vite lib build (entries are hand-listed). */
function addViteEntry(
  tree: Tree,
  n: { fileName: string; propertyName: string },
): void {
  const vitePath = joinPathFragments(UI_ROOT, 'vite.config.mts');
  const vite = tree.read(vitePath, 'utf-8');
  if (vite === null) return; // Tree-based tests may omit it; the real repo has it.
  const marker = /(entry:\s*\{)/;
  if (
    !marker.test(vite) ||
    vite.includes(`src/components/${n.fileName}/index.ts`)
  ) {
    return;
  }
  const key = /^[a-z][a-zA-Z0-9]*$/.test(n.propertyName)
    ? n.propertyName
    : `'${n.fileName}'`;
  tree.write(
    vitePath,
    vite.replace(
      marker,
      `$1\n        ${key}: 'src/components/${n.fileName}/index.ts',`,
    ),
  );
}

export default componentGenerator;

import { describe, it, expect } from 'vitest';
// BOTH READ AS TEXT. A `with { type: 'json' }` import of `package.json` is not
// in `tsconfig.spec.json`'s file list and fails the build; reading the manifest
// the same way as the config keeps the check to one mechanism.
import packageJson from '../../package.json?raw';
import viteConfig from '../../vite.config.mts?raw';

/**
 * EVERY COMPONENT IS SHIPPABLE ON ITS OWN, machine-enforced.
 *
 * `build.md` and ADR-0019 both say a component is three steps: a barrel, a
 * `build.lib.entry` line, and an `exports` subpath. Nothing checked the last
 * two — so `TableSelectionBar` shipped having done only the first, and every
 * gate stayed green: it typechecks, it builds, it renders, it is exported from
 * the root barrel. It simply had no `@fmmenchi/ui/table-selection-bar`, which
 * nobody notices until a consumer imports granularly and the package's whole
 * tree-shaking story is a paragraph in a doc.
 *
 * The failure mode is quiet by construction, which is exactly the kind this
 * package writes a test for.
 */
const folders = Object.keys(
  import.meta.glob('../components/*/index.ts', { eager: true }),
)
  .map((path) => path.split('/').at(-2) as string)
  .sort();

/**
 * The folders `build.lib.entry` points at, read from the config as text.
 *
 * Matched on the PATH rather than on the key, because a single-word key is
 * written unquoted (`table:`) and a hyphenated one is not (`'table-row':`) —
 * a pattern keyed on the left-hand side reports every component in the package
 * as missing, which is a test that fails loudly and says nothing.
 */
const entries = new Set(
  [...viteConfig.matchAll(/'src\/components\/([a-z0-9-]+)\/index\.ts'/g)].map(
    (match) => match[1] as string,
  ),
);

const subpaths = new Set(
  Object.keys(
    (JSON.parse(packageJson) as { exports: Record<string, unknown> }).exports,
  )
    .filter((key) => key.startsWith('./'))
    .map((key) => key.slice(2)),
);

describe('every component is its own build entry and subpath', () => {
  it('found the components at all', () => {
    // Not pinned to a count: pinned to "more than a handful", so the glob
    // failing silently after a move is a red test rather than a green one.
    expect(folders.length).toBeGreaterThan(20);
  });

  for (const folder of folders) {
    it(`${folder} has a vite entry`, () => {
      expect(
        entries.has(folder),
        `add \`'${folder}': 'src/components/${folder}/index.ts'\` to \`build.lib.entry\` in vite.config.mts`,
      ).toBe(true);
    });

    it(`${folder} has an exports subpath`, () => {
      expect(
        subpaths.has(folder),
        `add a \`"./${folder}"\` block to \`exports\` in package.json`,
      ).toBe(true);
    });
  }
});

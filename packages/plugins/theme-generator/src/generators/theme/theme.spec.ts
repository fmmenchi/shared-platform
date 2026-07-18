import { describe, it, expect, beforeEach } from 'vitest';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import {
  addProjectConfiguration,
  readProjectConfiguration,
  type Tree,
} from '@nx/devkit';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { themeGenerator } from './theme';

// The REAL contract of this workspace — the spec proves the scaffold stays in
// sync with vars.css by construction (role sets must be identical).
const here = fileURLToPath(new URL('.', import.meta.url));
const varsPath = join(here, '../../../../../client/tokens/src/styles/vars.css');
const contractRoles = [
  ...readFileSync(varsPath, 'utf8').matchAll(/--fm-color-[a-z0-9-]+/g),
].map((m) => m[0]);

describe('theme generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    addProjectConfiguration(tree, 'web', { root: 'apps/web' });
  });

  it('scaffolds a COMPLETE theme from the installed contract', async () => {
    await themeGenerator(tree, {
      name: 'acme',
      project: 'web',
      tokensPath: varsPath,
    });
    const css = tree.read('apps/web/src/themes/acme.css', 'utf-8') as string;
    expect(css).toContain("[data-theme='acme']");
    const generated = [...css.matchAll(/--fm-color-[a-z0-9-]+(?=:)/g)].map(
      (m) => m[0],
    );
    expect(generated.sort()).toEqual([...new Set(contractRoles)].sort());
  });

  it('wires the validate-themes target via the validation generator', async () => {
    await themeGenerator(tree, {
      name: 'acme',
      project: 'web',
      tokensPath: varsPath,
    });
    const target = readProjectConfiguration(tree, 'web').targets?.[
      'validate-themes'
    ];
    expect(target?.executor).toBe('@fmmenchi/theme-generator:validate');
    expect(target?.options.themes).toEqual(['apps/web/src/themes/acme.css']);
  });

  it('is additive: a second theme joins the same target', async () => {
    await themeGenerator(tree, {
      name: 'acme',
      project: 'web',
      tokensPath: varsPath,
    });
    await themeGenerator(tree, {
      name: 'noir',
      project: 'web',
      tokensPath: varsPath,
    });
    const target = readProjectConfiguration(tree, 'web').targets?.[
      'validate-themes'
    ];
    expect(target?.options.themes).toEqual([
      'apps/web/src/themes/acme.css',
      'apps/web/src/themes/noir.css',
    ]);
  });

  it('honors skipValidation', async () => {
    await themeGenerator(tree, {
      name: 'acme',
      project: 'web',
      skipValidation: true,
      tokensPath: varsPath,
    });
    expect(
      readProjectConfiguration(tree, 'web').targets?.['validate-themes'],
    ).toBeUndefined();
  });

  it('rejects an invalid data-theme name', async () => {
    await expect(
      themeGenerator(tree, {
        name: 'Not Valid',
        project: 'web',
        tokensPath: varsPath,
      }),
    ).rejects.toThrow(/Invalid theme name/);
  });
});

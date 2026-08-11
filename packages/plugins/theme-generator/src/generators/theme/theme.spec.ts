import { describe, it, expect, beforeEach } from 'vitest';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import {
  addProjectConfiguration,
  readProjectConfiguration,
  type Tree,
} from '@nx/devkit';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
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
    expect(target?.executor).toBe('@fmmenchi/nx-theme-generator:validate');
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

  it('does not scaffold a role that is commented out', async () => {
    // The completeness assertion above cannot see this: it derives the expected
    // set with the same regex, so a commented-out role would appear on BOTH
    // sides and the test would agree with the bug. A synthetic contract with
    // one live role and one dead one is the only honest probe — the ordinary
    // `/* off for now` around a block during a retune.
    const dir = mkdtempSync(join(tmpdir(), 'fm-theme-'));
    const synthetic = join(dir, 'vars.css');
    writeFileSync(
      synthetic,
      ':root {\n' +
        '  --fm-color-primary: oklch(41% 0.135 255);\n' +
        '  /* off for now\n' +
        '  --fm-color-accent: oklch(50% 0.1 200);\n' +
        '  */\n' +
        '}\n',
    );

    await themeGenerator(tree, {
      name: 'acme',
      project: 'web',
      tokensPath: synthetic,
    });
    const css = tree.read('apps/web/src/themes/acme.css', 'utf-8') as string;
    expect(css).toContain('--fm-color-primary:');
    expect(css).not.toContain('--fm-color-accent');
  });

  it("declares the theme's color-scheme, light unless told otherwise", async () => {
    // Without it, the parts the BROWSER paints — a select's popup, a native
    // checkbox — keep the page's scheme, and a dark brand theme ships white
    // native lists on Safari and Firefox (the recorded defect of hand-written
    // presets).
    await themeGenerator(tree, {
      name: 'acme',
      project: 'web',
      tokensPath: varsPath,
    });
    expect(tree.read('apps/web/src/themes/acme.css', 'utf-8')).toContain(
      'color-scheme: light;',
    );

    await themeGenerator(tree, {
      name: 'noir',
      project: 'web',
      scheme: 'dark',
      tokensPath: varsPath,
    });
    expect(tree.read('apps/web/src/themes/noir.css', 'utf-8')).toContain(
      'color-scheme: dark;',
    );
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

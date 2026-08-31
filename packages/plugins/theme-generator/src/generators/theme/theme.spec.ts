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

/**
 * INSTALLING A THEME SOMEBODY ELSE BUILT.
 *
 * The consumer-facing half of the pipeline: a builder decides the colours, this
 * puts them in the repo. The interesting assertions are not that it copies a
 * JSON blob — they are the two boundaries. It reads ONLY `colors`, so the
 * builder can carry whatever it needs to reopen its own form in the same file
 * without this generator having an opinion about it; and it refuses to write a
 * theme that would not survive the gate it is about to wire.
 */
describe('theme generator — --from', () => {
  let tree: Tree;
  let dir: string;

  const write = (name: string, contents: unknown) => {
    const path = join(dir, name);
    writeFileSync(path, JSON.stringify(contents));
    return path;
  };

  /** A complete theme: every role the contract names, one paintable value. */
  const completeColors = () =>
    Object.fromEntries(
      [...new Set(contractRoles)].map((v) => [
        v.replace('--fm-color-', ''),
        'oklch(50% 0.02 256)',
      ]),
    );

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    addProjectConfiguration(tree, 'web', { root: 'apps/web' });
    dir = mkdtempSync(join(tmpdir(), 'fm-theme-from-'));
  });

  it('installs the colors from the file', async () => {
    const from = write('brand.json', { colors: completeColors() });

    await themeGenerator(tree, {
      name: 'acme',
      project: 'web',
      from,
      tokensPath: varsPath,
      skipValidation: true,
    });
    const css = tree.read('apps/web/src/themes/acme.css', 'utf-8') as string;

    expect(css).toContain("[data-theme='acme']");
    expect(css).toContain('--fm-color-primary: oklch(50% 0.02 256);');
  });

  it('IGNORES every key but `colors`, so the builder owns the rest', () => {
    // The property this generator's stability rests on: a builder that changes
    // how it records its own state — which rung a role took, what a person
    // overrode — must never need this package to agree.
    const from = write('brand.json', {
      colors: completeColors(),
      source: {
        bases: { primary: '#635BFF' },
        overrides: { ring: 'whatever' },
      },
      somethingInventedNextYear: [1, 2, 3],
    });

    return expect(
      themeGenerator(tree, {
        name: 'acme',
        project: 'web',
        from,
        tokensPath: varsPath,
        skipValidation: true,
      }),
    ).resolves.not.toThrow();
  });

  it('does not fall back to the reference theme when --from is given', async () => {
    // A silent fallback would install OUR colours under THEIR name, and the
    // failure is invisible: a complete, valid, entirely wrong theme.
    const from = write('brand.json', {
      colors: { ...completeColors(), primary: 'oklch(70% 0.1 30)' },
    });

    await themeGenerator(tree, {
      name: 'acme',
      project: 'web',
      from,
      tokensPath: varsPath,
      skipValidation: true,
    });
    const css = tree.read('apps/web/src/themes/acme.css', 'utf-8') as string;

    expect(css).toContain('--fm-color-primary: oklch(70% 0.1 30);');
    expect(css).not.toContain('var(--fm-palette-');
  });

  it('REFUSES a file with no `colors`, saying what one looks like', async () => {
    const from = write('brand.json', { theme: completeColors() });

    await expect(
      themeGenerator(tree, { name: 'acme', project: 'web', from }),
    ).rejects.toThrow(/no "colors" object/);
  });

  it('REFUSES a role whose value is not a string, naming it', async () => {
    const from = write('brand.json', {
      colors: { ...completeColors(), primary: { l: 50 } },
    });

    await expect(
      themeGenerator(tree, { name: 'acme', project: 'web', from }),
    ).rejects.toThrow(/not strings: primary/);
  });

  it('REFUSES an empty `colors`', async () => {
    const from = write('brand.json', { colors: {} });

    await expect(
      themeGenerator(tree, { name: 'acme', project: 'web', from }),
    ).rejects.toThrow(/declares no colors/);
  });

  it('says which file it could not read', async () => {
    await expect(
      themeGenerator(tree, {
        name: 'acme',
        project: 'web',
        from: join(dir, 'absent.json'),
      }),
    ).rejects.toThrow(/Could not read a theme from/);
  });

  it('writes NOTHING when the file is refused', async () => {
    const from = write('brand.json', { colors: {} });

    await expect(
      themeGenerator(tree, { name: 'acme', project: 'web', from }),
    ).rejects.toThrow();
    expect(tree.exists('apps/web/src/themes/acme.css')).toBe(false);
  });
});

/**
 * THE GATE, BEFORE ANYTHING IS WRITTEN.
 *
 * The reason `--from` validates rather than trusting its input: the theme lands
 * in a consumer's repo, and the check that would otherwise catch it runs in CI —
 * after the commit, after the review, on somebody else's branch. Refusing here
 * costs one command; refusing there costs a round trip.
 *
 * The fixture used by the install cases above is deliberately one flat colour for
 * every role, which is exactly what this refuses: a complete theme where nothing
 * can be read on anything. That is why those cases pass `skipValidation` — the
 * flag means "do not gate this theme", and it now means it for both the target it
 * would have wired and the check it would have run.
 */
describe('theme generator — --from validates first', () => {
  let tree: Tree;
  let dir: string;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    addProjectConfiguration(tree, 'web', { root: 'apps/web' });
    dir = mkdtempSync(join(tmpdir(), 'fm-theme-gate-'));
  });

  const writeTheme = (colors: Record<string, unknown>) => {
    const path = join(dir, 'brand.json');
    writeFileSync(path, JSON.stringify({ colors }));
    return path;
  };

  const flat = () =>
    Object.fromEntries(
      [...new Set(contractRoles)].map((v) => [
        v.replace('--fm-color-', ''),
        'oklch(50% 0.02 256)',
      ]),
    );

  it('REFUSES a theme whose declared pairs cannot be read, and writes nothing', async () => {
    const from = writeTheme(flat());

    await expect(
      themeGenerator(tree, {
        name: 'acme',
        project: 'web',
        from,
        tokensPath: varsPath,
      }),
    ).rejects.toThrow(/is not a valid theme, so nothing was written/);
    expect(tree.exists('apps/web/src/themes/acme.css')).toBe(false);
  });

  it('CATCHES an exporter that emitted var() references instead of literals', async () => {
    // The trap this closes, and it is the one the scaffold path still has: a
    // `[data-theme]` block full of `var(--fm-palette-…)` resolves against the
    // ROOT palette, so it installs cleanly, validates as complete by any check
    // that only counts roles, and changes not one colour on the page.
    const from = writeTheme(
      Object.fromEntries(
        [...new Set(contractRoles)].map((v) => [
          v.replace('--fm-color-', ''),
          'var(--fm-palette-primary-700)',
        ]),
      ),
    );

    await expect(
      themeGenerator(tree, {
        name: 'acme',
        project: 'web',
        from,
        tokensPath: varsPath,
      }),
    ).rejects.toThrow(/is not a valid theme/);
  });

  it('reports every violation at once, not the first', async () => {
    // A person fixing a theme wants the list. Reporting one at a time turns one
    // conversation into as many round trips as there are mistakes.
    const from = writeTheme(flat());

    await expect(
      themeGenerator(tree, {
        name: 'acme',
        project: 'web',
        from,
        tokensPath: varsPath,
      }),
    ).rejects.toThrow(/\n[\s\S]*\n/);
  });
});

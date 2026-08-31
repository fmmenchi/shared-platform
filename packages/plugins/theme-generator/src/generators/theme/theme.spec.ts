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
 * The consumer-facing half: a builder decides the theme, this puts it in the repo.
 * The assertions worth making are not that JSON survives a round trip — they are
 * the two boundaries. It reads DECLARATIONS, not finished colours, so a consumer's
 * theme keeps the shape ours has (a base, a ramp derived from it, a role pointing
 * at a rung) instead of being a photograph of it. And it reads only that key, so
 * the builder can carry whatever it needs to reopen its own form in the same file.
 */
describe('theme generator — --from', () => {
  let tree: Tree;
  let dir: string;

  const write = (contents: unknown) => {
    const path = join(dir, 'brand.json');
    writeFileSync(path, JSON.stringify(contents));
    return path;
  };

  /** Every role the contract names, one flat value. Deliberately unreadable. */
  const flatRoles = () =>
    Object.fromEntries(
      [...new Set(contractRoles)].map((v) => [v, 'oklch(50% 0.02 256)']),
    );

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    addProjectConfiguration(tree, 'web', { root: 'apps/web' });
    dir = mkdtempSync(join(tmpdir(), 'fm-theme-from-'));
  });

  it('writes the declarations, whatever layer they belong to', async () => {
    // The point of taking declarations rather than roles: a base and a ramp step
    // are as installable as a role, and this generator does not tell them apart.
    const from = write({
      declarations: {
        ...flatRoles(),
        '--fm-palette-primary-base': 'oklch(55% 0.14 255)',
        '--fm-palette-primary-700': 'oklch(41% 0.135 255)',
      },
    });

    await themeGenerator(tree, {
      name: 'acme',
      project: 'web',
      from,
      tokensPath: varsPath,
      skipValidation: true,
    });
    const css = tree.read('apps/web/src/themes/acme.css', 'utf-8') as string;

    expect(css).toContain("[data-theme='acme']");
    expect(css).toContain('--fm-palette-primary-base: oklch(55% 0.14 255);');
    expect(css).toContain('--fm-palette-primary-700: oklch(41% 0.135 255);');
    expect(css).toContain('--fm-color-primary: oklch(50% 0.02 256);');
  });

  it('IGNORES every key but `declarations`, so the builder owns the rest', () => {
    // What this generator's stability rests on: a builder that changes how it
    // records its own state must never need this package to agree.
    const from = write({
      declarations: flatRoles(),
      source: { bases: { primary: '#635BFF' }, pinned: ['ring'] },
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
    // A silent fallback would install OUR colours under THEIR name: a complete,
    // valid, entirely wrong theme, and nothing on screen to suggest it.
    const from = write({
      declarations: {
        ...flatRoles(),
        '--fm-color-primary': 'oklch(70% 0.1 30)',
      },
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

  it('REFUSES a file with no `declarations`, saying what one looks like', async () => {
    const from = write({ colors: flatRoles() });

    await expect(
      themeGenerator(tree, { name: 'acme', project: 'web', from }),
    ).rejects.toThrow(/no "declarations" object/);
  });

  it('REFUSES a declaration that is not a string, naming it', async () => {
    const from = write({
      declarations: { ...flatRoles(), '--fm-color-primary': { l: 50 } },
    });

    await expect(
      themeGenerator(tree, { name: 'acme', project: 'web', from }),
    ).rejects.toThrow(/not strings: --fm-color-primary/);
  });

  it('REFUSES a name that is not a token of this contract', async () => {
    // A theme file is not a stylesheet: anything outside `--fm-*` either lands in
    // the consumer's CSS doing nothing, or does something nobody asked for.
    const from = write({
      declarations: { ...flatRoles(), '--brand-shadow': '0 0 4px red' },
    });

    await expect(
      themeGenerator(tree, { name: 'acme', project: 'web', from }),
    ).rejects.toThrow(/not tokens of this contract: --brand-shadow/);
  });

  it('REFUSES an empty `declarations`', async () => {
    const from = write({ declarations: {} });

    await expect(
      themeGenerator(tree, { name: 'acme', project: 'web', from }),
    ).rejects.toThrow(/declares nothing/);
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
    const from = write({ declarations: {} });

    await expect(
      themeGenerator(tree, { name: 'acme', project: 'web', from }),
    ).rejects.toThrow();
    expect(tree.exists('apps/web/src/themes/acme.css')).toBe(false);
  });
});

/**
 * THE GATE, BEFORE ANYTHING IS WRITTEN.
 *
 * `--from` is the one place foreign input enters the pipeline, which is why it is
 * the one place worth checking before touching the repo. The roles are RESOLVED
 * against the file's own declarations first — a role here legitimately points at a
 * rung the file also carries, and that is the whole reason the handoff is
 * declarations rather than finished colours.
 */
describe('theme generator — --from validates first', () => {
  let tree: Tree;
  let dir: string;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    addProjectConfiguration(tree, 'web', { root: 'apps/web' });
    dir = mkdtempSync(join(tmpdir(), 'fm-theme-gate-'));
  });

  const write = (declarations: Record<string, unknown>) => {
    const path = join(dir, 'brand.json');
    writeFileSync(path, JSON.stringify({ declarations }));
    return path;
  };

  const flatRoles = () =>
    Object.fromEntries(
      [...new Set(contractRoles)].map((v) => [v, 'oklch(50% 0.02 256)']),
    );

  it('REFUSES a theme whose declared pairs cannot be read, and writes nothing', async () => {
    const from = write(flatRoles());

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

  it('RESOLVES a role through the file’s own palette before judging it', async () => {
    // The case a colours-only handoff could not express, and the reason the gate
    // resolves rather than parsing: `var()` here is correct, not a mistake.
    const from = write({
      ...flatRoles(),
      '--fm-palette-brand-500': 'oklch(50% 0.02 256)',
      '--fm-color-primary': 'var(--fm-palette-brand-500)',
    });

    // It still fails — one flat colour cannot satisfy contrast — but on the
    // CONTRAST complaint, which proves the reference was followed rather than
    // reported as unparsable.
    await expect(
      themeGenerator(tree, {
        name: 'acme',
        project: 'web',
        from,
        tokensPath: varsPath,
      }),
    ).rejects.toThrow(/is not a valid theme/);
    await expect(
      themeGenerator(tree, {
        name: 'acme',
        project: 'web',
        from,
        tokensPath: varsPath,
      }),
    ).rejects.not.toThrow(/--fm-color-primary does not resolve/);
  });

  it('CATCHES a reference pointing at nothing', async () => {
    // Left alone it installs a role that falls back to its `@property`
    // initial-value — opaque black, in both themes, with nothing falsy to detect.
    const from = write({
      ...flatRoles(),
      '--fm-color-primary': 'var(--fm-palette-absent-500)',
    });

    await expect(
      themeGenerator(tree, {
        name: 'acme',
        project: 'web',
        from,
        tokensPath: varsPath,
      }),
    ).rejects.toThrow(/--fm-color-primary does not resolve/);
  });

  it('reports every violation at once, not the first', async () => {
    const from = write(flatRoles());

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

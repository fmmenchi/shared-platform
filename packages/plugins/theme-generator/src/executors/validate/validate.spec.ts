import { describe, it, expect, beforeAll } from 'vitest';
import type { ExecutorContext } from '@nx/devkit';
import { COLOR_ROLES, parseTheme, toTheme } from '@fmmenchi/theme';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import executor from './validate';

/**
 * THE EXECUTOR NOW RUNS THE REAL VALIDATOR, and the fixtures had to change with
 * it. They used to face a three-line stub reached through `tokensPath`, so a
 * one-role stylesheet counted as an allowed theme; the rules are imported now, and
 * a theme is only allowed when it is COMPLETE — every role, every declared pair
 * clearing its floor.
 *
 * So the passing fixture is the reference theme itself, resolved: read
 * `@fmmenchi/tokens`' own `vars.css`, follow every `var()` and evaluate the
 * relative-colour ramp, and write the result out. That is a real theme rather than
 * a hand-built one, which also means this suite fails if the shipped theme ever
 * stops being allowed — a check worth having in the tool that installs themes.
 *
 * What it still proves is the wiring, which is all an executor has: reading the
 * files, parsing declarations, the pass/fail report, the exit status.
 */
let dir: string;

const varsPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../../client/tokens/src/styles/vars.css',
);

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'fm-validate-'));

  const reference = toTheme(parseTheme(readFileSync(varsPath, 'utf8')));
  const rows = Object.entries(reference)
    .map(([role, value]) => `  --fm-color-${role}: ${value as string};`)
    .join('\n');
  writeFileSync(join(dir, 'good.css'), `[data-theme='x'] {\n${rows}\n}\n`);

  // THE CASE THIS EXECUTOR USED TO REFUSE. A theme whose roles POINT at palette
  // rungs, carrying the palette with it — which is exactly the three-layer file
  // `theme --from` writes, and the whole reason the handoff is declarations rather
  // than eighty-four finished colours. Measured as written, `var(--fm-palette-…)` is
  // not a colour, so every role came back unparsable and the tool's own output was
  // rejected by the tool's own gate.
  const referenceDeclared = parseTheme(readFileSync(varsPath, 'utf8'));
  const carried = [...referenceDeclared]
    .filter(([name]) => name.startsWith('--fm-palette-'))
    .map(([name, value]) => `  ${name}: ${value};`)
    .join('\n');
  const pointing = COLOR_ROLES.map(
    (role) =>
      `  --fm-color-${role}: ${referenceDeclared.get(`--fm-color-${role}`) as string};`,
  ).join('\n');
  writeFileSync(
    join(dir, 'pointing.css'),
    `[data-theme='x'] {\n${carried}\n${pointing}\n}\n`,
  );

  // The same thing WITHOUT the palette underneath it: the roles point at rungs the
  // file never declares. In the cascade that is fine — `vars.css` is at `:root` — so
  // the executor resolves against the installed contract and this must pass too.
  writeFileSync(
    join(dir, 'pointing-bare.css'),
    `[data-theme='x'] {\n${pointing}\n}\n`,
  );

  // A role pointing at a rung NOBODY declares — not the file, not the reference.
  // This is the mistake an exporter actually makes, and it must be named rather
  // than reported as an unparsable colour.
  writeFileSync(
    join(dir, 'dangling.css'),
    `[data-theme='x'] {\n${pointing.replace(
      /--fm-color-primary: [^;]+;/,
      '--fm-color-primary: var(--fm-palette-primary-4200);',
    )}\n}\n`,
  );

  writeFileSync(
    join(dir, 'bad.css'),
    "[data-theme='x'] {\n  --fm-color-border: oklch(91% 0.008 256);\n}\n",
  );

  // `primary` exists ONLY inside a comment — the retune leftover. The gate must
  // read what the browser reads, so this theme is INCOMPLETE; with a naive regex
  // the role is found in the comment and the validator scores a value the shipped
  // CSS does not define.
  writeFileSync(
    join(dir, 'commented.css'),
    "[data-theme='x'] {\n" +
      '  /* off for now\n' +
      '  --fm-color-primary: oklch(41% 0.135 255);\n' +
      '  */\n' +
      '  --fm-color-border: oklch(91% 0.008 256);\n' +
      '}\n',
  );
});

const context = () =>
  ({
    root: dir,
    cwd: dir,
    isVerbose: false,
    projectGraph: { nodes: {}, dependencies: {} },
    projectsConfigurations: { projects: {}, version: 2 },
    nxJsonConfiguration: {},
  }) as ExecutorContext;

describe('validate executor', () => {
  it('passes when every theme is allowed', async () => {
    const out = await executor({ themes: ['good.css'] }, context());
    expect(out.success).toBe(true);
  });

  it('fails when a theme violates the contract', async () => {
    const out = await executor({ themes: ['good.css', 'bad.css'] }, context());
    expect(out.success).toBe(false);
  });

  it('does not read a role out of a comment', async () => {
    const out = await executor({ themes: ['commented.css'] }, context());
    expect(out.success).toBe(false);
  });

  it('ALLOWS a theme whose roles point at rungs it carries', async () => {
    // The regression this executor shipped with. `theme --from` writes exactly this
    // file and validates it in memory before writing; the gate then refused it,
    // complaining about unparsable colours rather than about the reference it had
    // not followed. Every role said `var(--fm-palette-…)`, and a `var()` is not a
    // colour until somebody resolves it.
    const out = await executor(
      { themes: ['pointing.css'], tokensPath: varsPath },
      context(),
    );

    expect(out.success).toBe(true);
  });

  it('resolves against the REFERENCE stylesheet when the theme omits the palette', async () => {
    // A theme block sits over `vars.css` in the cascade, so pointing at a rung the
    // reference declares is correct and needs no copy of the palette. The executor
    // has to see what the browser sees.
    const out = await executor(
      { themes: ['pointing-bare.css'], tokensPath: varsPath },
      context(),
    );

    expect(out.success).toBe(true);
  });

  it('still refuses a reference NOTHING declares, and names it', async () => {
    const out = await executor(
      { themes: ['dangling.css'], tokensPath: varsPath },
      context(),
    );

    expect(out.success).toBe(false);
  });

  it('does NOT let the reference stylesheet complete an incomplete theme', async () => {
    // THE TRAP IN THE OBVIOUS FIX, and the reason `judgeTheme` takes two maps. Merge
    // the reference underneath and every role the theme FORGOT resolves out of it —
    // so a one-role stylesheet reports as an allowed theme, which is the single
    // verdict nothing downstream can recover from. Completeness is judged on the
    // theme's own roles; only resolution looks wider.
    const out = await executor(
      { themes: ['bad.css'], tokensPath: varsPath },
      context(),
    );

    expect(out.success).toBe(false);
  });
});

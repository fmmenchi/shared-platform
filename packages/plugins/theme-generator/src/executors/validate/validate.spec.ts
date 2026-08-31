import { describe, it, expect, beforeAll } from 'vitest';
import type { ExecutorContext } from '@nx/devkit';
import { parseTheme, toTheme } from '@fmmenchi/theme';
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
});

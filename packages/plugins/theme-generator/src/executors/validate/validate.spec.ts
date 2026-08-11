import { describe, it, expect, beforeAll } from 'vitest';
import type { ExecutorContext } from '@nx/devkit';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import executor from './validate';

// The executor is exercised against a stub validate module (the REAL
// validateTheme is exercised in @fmmenchi/tokens' own tests): here we prove
// the wiring — CSS parsing, module resolution via tokensPath, pass/fail
// reporting and the exit status.
let dir: string;
let tokensPath: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'fm-validate-'));
  tokensPath = join(dir, 'validate.mjs');
  writeFileSync(
    tokensPath,
    `export function validateTheme(colors) {
       return colors['primary'] ? [] : [{ message: 'missing color role "primary"' }];
     }`,
  );
  writeFileSync(
    join(dir, 'good.css'),
    "[data-theme='x'] {\n  --fm-color-primary: oklch(41% 0.135 255);\n}\n",
  );
  writeFileSync(
    join(dir, 'bad.css'),
    "[data-theme='x'] {\n  --fm-color-border: oklch(91% 0.008 256);\n}\n",
  );
  // `primary` exists ONLY inside a comment — the retune leftover. The gate must
  // read what the browser reads, so this theme is INCOMPLETE; before comments
  // were stripped, the regex found the role in the comment and the validator
  // scored a value the shipped CSS does not define.
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
    const out = await executor({ themes: ['good.css'], tokensPath }, context());
    expect(out.success).toBe(true);
  });

  it('fails when a theme violates the contract', async () => {
    const out = await executor(
      { themes: ['good.css', 'bad.css'], tokensPath },
      context(),
    );
    expect(out.success).toBe(false);
  });

  it('does not read a role out of a comment', async () => {
    const out = await executor(
      { themes: ['commented.css'], tokensPath },
      context(),
    );
    expect(out.success).toBe(false);
  });
});
